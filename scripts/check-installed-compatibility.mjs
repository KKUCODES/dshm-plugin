import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { files as discovery } from '../compatibility/model-discovery/prepare.mjs';
import { files as endpoint } from '../compatibility/model-discovery/endpoint.mjs';
import * as ptc from '../compatibility/ptc-cancel/prepare.mjs';
import * as inner from '../compatibility/ptc-cancel/prepare-inner.mjs';
import { transform as autoReview } from '../compatibility/auto-review-cancel/patch.mjs';
import { changes as metadata } from '../compatibility/file-metadata/patch.mjs';
import { applyChange } from '../compatibility/background-output/prepare.mjs';
import { inputs as startupInputs, patchedCommand } from '../compatibility/source-start/install.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = resolve(root, 'artifacts/compatibility');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const lf = text => text.replaceAll('\r\n', '\n');
const manifests = [
  'background-output/manifest.json', 'background-output/runtime-manifest.json',
  'foreground-output/manifest.json', 'foreground-output/runtime-manifest.json',
  'pending-notifications/manifest.json', 'pending-notifications/runtime-manifest.json',
  'client-entries/manifest.json', 'client-entries/runtime-manifest.json',
  'plugin-install-cancel/runtime-manifest.json', 'desktop-apps/package/manifest.json',
  'desktop-app-icons/package/manifest.json', 'cordis-inspect/package/manifest.json',
  'cordis-approval-race/manifest.json', 'cordis-client-lifetime/manifest.json',
  'cordis-inventory-sync/manifest.json', 'pwsh-output-encoding/manifest.json',
  'plugin-restart-notice/manifest.json',
];

/** 只接受一条连贯变更链；不能因文件匹配任意旧补丁就认为全部补丁已安装。 */
export function finalPatch(rows) {
  const edges = [...new Map(rows.filter(r => r.before !== r.after).map(r => [r.before + ':' + r.after, r])).values()];
  assert.ok(edges.length > 0, 'Expected an actual patch');
  const starts = edges.filter(r => !edges.some(other => other.after === r.before));
  assert.equal(starts.length, 1, 'Disconnected or cyclic patch history');
  const visited = new Set(); let current = starts[0];
  while (true) {
    assert.ok(!visited.has(current), 'Cyclic patch history'); visited.add(current);
    const next = edges.filter(r => r.before === current.after);
    assert.ok(next.length <= 1, 'Branched patch history');
    if (!next.length) break;
    current = next[0];
  }
  assert.equal(visited.size, edges.length, 'Unaccounted patch history');
  return current;
}

async function inside(directory, path) {
  assert.ok(!isAbsolute(path) && !path.split(/[\\/]/).includes('..'), 'Invalid relative path');
  const file = await realpath(resolve(directory, path));
  const rel = relative(directory, file);
  assert.ok(rel && !isAbsolute(rel) && !rel.startsWith('..'), 'File escapes expected directory');
  return file;
}

export async function inspectInstalled(target) {
  const installed = await realpath(resolve(target));
  const report = { at: new Date().toISOString(), root: installed, scope: 'installed-compatibility-files',
    ok: false, manifests: [], files: [], errors: [] };
  const rows = [];
  const add = row => {
    assert.match(row.before, /^[a-f0-9]{64}$/); assert.match(row.after, /^[a-f0-9]{64}$/);
    rows.push(row);
  };
  try {
    const pkg = JSON.parse(await readFile(await inside(installed, 'package.json'), 'utf8'));
    assert.equal(pkg.name, '@deepseek-ai/dsh-root'); assert.equal(pkg.version, '0.1.6-alpha.2');
    for (const name of manifests) {
      const bytes = await readFile(await inside(artifacts, name));
      const manifest = JSON.parse(bytes);
      report.manifests.push({ path: name, sha256: hash(bytes), patchVersion: manifest.patchVersion });
      const prefix = name.startsWith('cordis-inventory-sync/') ? 'packages/'
        : name.startsWith('cordis-client-lifetime/') ? 'packages/extensions/' : '';
      const changedInputs = (manifest.sourceInputs ?? []).filter(f => f.after && f.before !== f.after);
      for (const file of [...(manifest.files ?? []), ...changedInputs]) add({ path: prefix + file.path,
        before: file.before ?? file.originalSha256, after: file.after ?? file.patchedSha256,
        normalized: Boolean(file.patchedSha256) || changedInputs.includes(file), source: name });
    }
    for (const [name, definitions] of [['model-discovery', discovery], ['model-discovery-endpoint', endpoint]]) {
      for (const [path, expected, transform] of definitions) {
        const before = await readFile(await inside(artifacts, `${name}/before/${path}`));
        assert.equal(hash(before), expected);
        let text = transform(lf(before.toString('utf8')));
        if (before.includes(Buffer.from('\r\n'))) text = text.replaceAll('\n', '\r\n');
        const after = await readFile(await inside(artifacts, `${name}/after/${path}`));
        assert.equal(hash(after), hash(text));
        add({ path: `packages/llm/llm-pi-ai/${path}`, before: expected, after: hash(after), source: name });
      }
    }
    for (const [name, specification] of [['ptc-cancel', ptc], ['ptc-inner-cancel', inner]]) {
      for (const [path, expected] of Object.entries(specification.files)) {
        const ts = path.endsWith('.ts');
        const before = await readFile(await inside(artifacts, `${name}/original.${ts ? 'ts' : 'mjs'}`));
        assert.equal(hash(before), expected);
        add({ path, before: expected, after: hash(specification.transform(before.toString('utf8'), ts)), source: name });
      }
    }
    for (const [path, ext, expected] of [
      ['src/index.ts', 'ts', 'd4ba657e99ed3e56b0c78c3626c1ed74b9d8e1cffee11b58b106a14a352ff4f6'],
      ['lib/index.js', 'mjs', 'bd0d44af90661076d0b7caccb74953d8f5fdcc5e380da02b09ba612e39535436'],
    ]) {
      const before = await readFile(await inside(artifacts, `auto-review-cancel/original.${ext}`));
      assert.equal(hash(before), expected);
      add({ path: `packages/experimental/auto-review/${path}`, before: expected,
        after: hash(autoReview(before.toString('utf8'))), source: 'auto-review-cancel' });
    }
    for (const change of metadata) {
      const before = await readFile(await inside(artifacts, `file-metadata/before/${change.path}`), 'utf8');
      const after = await readFile(await inside(artifacts, `file-metadata/after/${change.path}`), 'utf8');
      assert.equal(lf(after), applyChange(change, before));
      add({ path: change.path, before: hash(lf(before)), after: hash(lf(after)), normalized: true, source: 'file-metadata' });
    }
    const grouped = new Map();
    for (const row of rows) { if (!grouped.has(row.path)) grouped.set(row.path, []); grouped.get(row.path).push(row); }
    for (const [path, history] of grouped) {
      const expected = finalPatch(history);
      const bytes = await readFile(await inside(installed, path));
      const actual = hash(bytes), normalizedHash = expected.normalized ? hash(lf(bytes.toString('utf8'))) : null;
      const matched = actual === expected.after || normalizedHash === expected.after;
      report.files.push({ path, sha256: actual, expected: expected.after, matched,
        comparison: actual === expected.after ? 'bytes' : expected.normalized ? 'normalized-LF' : 'bytes',
        finalSource: expected.source, history: history.map(({ before, after, source }) => ({ before, after, source })) });
      if (!matched) report.errors.push(`Installed file mismatch: ${path}`);
    }
    assert.equal(pkg.scripts.dsh, patchedCommand, 'Source startup command differs');
    for (const [path, expected] of startupInputs)
      assert.equal(hash(lf(await readFile(await inside(installed, path), 'utf8'))), expected, `Startup baseline: ${path}`);
    report.startup = { commandMatches: true, payloads: [] };
    for (const name of ['register.mjs', 'bootstrap.mjs']) {
      const expected = hash(await readFile(resolve(root, 'compatibility/source-start', name)));
      assert.equal(hash(await readFile(await inside(installed, `.dshm-source/${name}`))), expected);
      report.startup.payloads.push({ path: `.dshm-source/${name}`, sha256: expected });
    }
    report.scopeLinks = [];
    const expectedScope = await realpath(resolve(installed, 'packages/core/scope'));
    for (const name of ['tool-bash', 'tool-pwsh']) {
      const path = `packages/shell/${name}/node_modules/@deepseek-ai/dsh-scope`;
      assert.equal((await realpath(resolve(installed, path))).toLowerCase(), expectedScope.toLowerCase());
      report.scopeLinks.push({ path, matches: true });
    }
    report.ok = report.errors.length === 0;
  } catch (error) { report.errors.push(error.message); }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Usage: node scripts/check-installed-compatibility.mjs <DSH directory>');
  const report = await inspectInstalled(process.argv[2]);
  await writeFile(resolve(root, 'artifacts/installed-compatibility-current.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, files: report.files.length, manifests: report.manifests.length,
    startup: report.startup?.commandMatches, scopeLinks: report.scopeLinks?.length, errors: report.errors }));
  if (!report.ok) process.exitCode = 1;
}

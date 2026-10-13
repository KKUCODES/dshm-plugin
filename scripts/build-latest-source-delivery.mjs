import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
import { digest, existingInside } from '../compatibility/install-files.mjs';
import { sourceRoot, outputRoot, applySourceChange } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceChanges, sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';

const root = resolve(import.meta.dirname, '..');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim(), sourceCommit);
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim(), '');
const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
assert.equal(manifest.files.length, sourceChanges.length); assert.equal(manifest.sourceCommit, sourceCommit);
const prepared = [];
for (const [index, change] of sourceChanges.entries()) {
  const file = manifest.files[index];
  assert.equal(file.path, change.path); assert.equal(file.sourceHash, change.hash);
  for (const kind of ['original', 'patched']) {
    const bytes = await readFile(await existingInside(outputRoot, `${kind}/${file.path}`));
    assert.equal(digest(bytes), file[kind === 'original' ? 'before' : 'after']);
    prepared.push({ path: `payload/${kind}/${file.path}`, bytes });
  }
  assert.equal(digest(Buffer.from(applySourceChange(change, prepared.at(-2).bytes.toString('utf8')))), file.after);
}
const startupHashes = {};
for (const name of ['register.mjs', 'bootstrap.mjs']) {
  const bytes = await readFile(resolve(root, 'compatibility/source-start', name));
  startupHashes[name] = digest(bytes); prepared.push({ path: `payload/startup/${name}`, bytes });
}
const parent = resolve(root, 'artifacts/latest-source-delivery');
await mkdir(parent, { recursive: true });
const output = await mkdtemp(resolve(parent, 'candidate-'));
for (const { path, bytes } of prepared) {
  await mkdir(dirname(resolve(output, path)), { recursive: true });
  await writeFile(resolve(output, path), bytes, { flag: 'wx' });
}
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
const runnerSourcePath = resolve(root, 'compatibility/latest-upstream/source-package-range.mjs');
const runnerAsset = await readFile(resolve(root, 'compatibility/latest-upstream/package-runner-source.ts'), 'utf8');
await build({
  entryPoints: [resolve(root, 'compatibility/latest-upstream/source-delivery.mjs')],
  outfile: resolve(output, 'install.mjs'), bundle: true, platform: 'node', target: 'node24', format: 'esm',
  banner: { js: "import { createRequire as deliveryCreateRequire } from 'node:module'; import { fileURLToPath as deliveryFileURLToPath } from 'node:url'; import { dirname as deliveryDirname } from 'node:path'; const require = deliveryCreateRequire(import.meta.url); const __filename = deliveryFileURLToPath(import.meta.url); const __dirname = deliveryDirname(__filename);" },
  define: { DSHM_SOURCE_DELIVERY_STARTUP_HASHES: JSON.stringify(startupHashes) },
  // 将固定变换使用的只读TS文本嵌入交付文件，避免解包后仍回读开发目录。
  plugins: [{ name: 'owned-package-runner-source', setup(builder) {
    builder.onLoad({ filter: /source-package-range\.mjs$/ }, async args => {
      assert.equal(resolve(args.path), runnerSourcePath);
      const text = await readFile(args.path, 'utf8');
      const anchor = "readFileSync(new URL('./package-runner-source.ts', import.meta.url), 'utf8')";
      assert.equal(text.split(anchor).length, 2);
      return { contents: text.replace(anchor, JSON.stringify(runnerAsset)), loader: 'js', resolveDir: dirname(args.path) };
    });
  } }],
});
await writeFile(resolve(output, 'README.md'), await readFile(resolve(root, 'compatibility/latest-upstream/source-delivery-readme.md')), { flag: 'wx' });
const installer = await readFile(resolve(output, 'install.mjs'));
const report = { at: new Date().toISOString(), candidateOnly: true, output, sourceCommit, version: manifest.version,
  patches: manifest.patches, sourceFiles: manifest.files.length, payloadFiles: prepared.length,
  manifestSha256: digest(await readFile(resolve(output, 'manifest.json'))), installerSha256: digest(installer), installerBytes: installer.length,
  startupHashes, sourceRuntimeVerified: false, remoteVerified: false };
await writeFile(resolve(output, 'build-report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));

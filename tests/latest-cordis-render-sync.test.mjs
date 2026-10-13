import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { prepareLatestCordisScopes } from '../compatibility/latest-upstream/cordis-scopes.mjs';
import { transformSourceCordisScopes } from '../compatibility/latest-upstream/source-cordis-scopes.mjs';

// 执行固定原文件中的真实方法体；受控服务仅核对诊断提交和通知顺序，不代替 Remote 鉴权验收。
function method(source) {
  const file = ts.createSourceFile('runner.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const matches = [];
  const visit = node => {
    if (ts.isMethodDeclaration(node) && node.name.getText(file) === 'reportRenderFailure') matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file); assert.equal(matches.length, 1);
  const member = matches[0];
  const body = member.body.getText(file);
  const params = member.parameters.map(parameter => parameter.name.getText(file)).join(', ');
  const js = ts.transpileModule(`async function report(${params}) ${body}`, {
    compilerOptions: { target: ts.ScriptTarget.ESNext },
  }).outputText;
  return runInNewContext(js + '\nreport', { Promise });
}

const published = await prepareLatestCordisScopes({ write: false });
const originalSource = (await readFile(resolve('artifacts/latest-source-patches/original/packages/extensions/cordis-host-runner/src/index.ts'), 'utf8')).replaceAll('\r\n', '\n');
const candidates = [
  ...published.files.filter(file => file.path.endsWith('index.js')).map(file => ({
    name: file.path.endsWith('types\\index.js') || file.path.endsWith('types/index.js') ? 'npm types' : 'npm bundle',
    original: file.original.toString(), current: file.modified,
  })),
  { name: 'source', original: originalSource, current: transformSourceCordisScopes('index.ts', originalSource) },
];

for (const candidate of candidates) {
  test(`${candidate.name}: 原渲染失败缺少通知，候选提交后通知且保持运行`, async () => {
    for (const [source, shouldEmit] of [[candidate.original, false], [candidate.current, true]]) {
      const definition = {}, plugin = { run: { pluginRunId: 'current', packageId: 'pkg' },
        packages: new Map([['pkg', definition]]), latestRun: { pluginRunId: 'current', client: { waitingFor: [] } } };
      const events = [], steers = [];
      const failure = { slot: 'conversation.session.header.actions', message: 'actual-render-cause', abdicated: true };
      const service = { owned: () => plugin,
        diagnostic: (_, __, phase, error) => ({ phase, message: error.message }),
        steerRenderFailure: (...args) => steers.push(args),
        ctx: { emit: event => events.push({ event, phase: plugin.latestRun.error.phase,
          status: plugin.latestRun.status, activeRun: plugin.run.pluginRunId }) },
        inspectRegistry: { assertClientManifestScope() {}, outsideClientManifestScope: callback => callback() },
      };
      const report = method(source);
      assert.equal(await report.call(service, {}, 'plugin', 'current', failure), null);
      assert.equal(plugin.latestRun.status, 'failed'); assert.equal(plugin.run.pluginRunId, 'current');
      assert.deepEqual(events, shouldEmit ? [{ event: 'cordis/inventory-changed', phase: 'client-render', status: 'failed', activeRun: 'current' }] : []);
      assert.equal(steers.length, 1);
      events.length = 0;
      assert.equal(await report.call(service, {}, 'plugin', 'old-run', { ...failure, message: 'stale' }), null);
      assert.equal(events.length, 0); assert.equal(steers.length, 1);
      assert.equal(plugin.run.renderFailure.message, failure.message);
    }
  });
}

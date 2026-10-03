import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { directory } from './changes.mjs';
import { outputRoot } from './build.mjs';

const root = 'F:/Program Files/deepseek-harness';
const require = createRequire(import.meta.url);
async function controller(patched) {
  const entry = resolve(root, directory, 'src/client/manager-store.ts');
  const result = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs',
    // 两个分支都读取固定产物，避免实际安装补丁后把新代码误当原基线。
    plugins: [{ name: 'stored-controller', setup(b) { b.onLoad({ filter: /manager-store\.ts$/ }, async () => ({
      contents: await readFile(resolve(outputRoot, patched ? 'after' : 'before', directory, 'src/client/manager-store.ts'), 'utf8'),
      loader: 'ts', resolveDir: resolve(root, directory, 'src/client'),
    })); } }] });
  const path = resolve(outputRoot, `test-${patched ? 'patched' : 'original'}.cjs`);
  await writeFile(path, result.outputFiles[0].contents);
  return require(path).PluginManagerController;
}
async function exercise(Controller, application) {
  let enabled = 0;
  const ok = value => Promise.resolve({ ok: true, value });
  const controller = new Controller({ remote: { pluginInventory: { list: () => ok({ entries: [], managementAvailable: true }) }, pluginManager: {
    listBundles: () => ok([]), listPlugins: () => ok([]),
    inspect: () => ok({ status: 'accepted', kind: 'registry', name: 'dsh-test', version: '1.0.0', bundle: true }),
    installBundle: () => ok({ changed: true, application, bundle: 'dsh-test', stage: 'enable', target: 'dsh-test' }),
    setBundleEnabled: () => { enabled++; return ok({ changed: true, application: 'applied', stage: 'enable', target: 'dsh-test' }); },
  } } });
  const face = controller.inject({ getSnapshot: () => ({ items: [], bundles: new Set(), rows: new Set() }), subscribe: () => () => {} });
  await controller.load(); face.openInstall(); face.editInstallSpec('dsh-test'); face.runInstall();
  for (let i = 0; i < 50 && controller.getSnapshot().install.phase !== 'done'; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(controller.getSnapshot().install.phase, 'done');
  face.enableInstalled(); await new Promise(r => setTimeout(r, 20));
  const open = controller.getSnapshot().install.open;
  face.closeInstall(); assert.equal(controller.getSnapshot().install.open, false);
  controller.dispose(); return { enabled, open };
}
test('原控制器会把需重启结果继续提交启用；补丁拒绝此动作且允许关闭', async () => {
  assert.deepEqual(await exercise(await controller(false), 'restart-required'), { enabled: 1, open: false });
  assert.deepEqual(await exercise(await controller(true), 'restart-required'), { enabled: 0, open: true });
});
test('可立即应用的新安装仍保持原启用路径', async () => {
  assert.deepEqual(await exercise(await controller(true), 'applied'), { enabled: 1, open: false });
});

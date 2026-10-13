import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { sdkModuleIdentityResolver, transformSdkModuleIdentity } from '../compatibility/latest-upstream/sdk-module-identity.mjs';

function resolver(platform = 'win32') {
  return vm.runInNewContext('(function(specifier, context, nextResolve, office, parentURL) {\n' + sdkModuleIdentityResolver + '\n})', { process: { platform } });
}
test('Windows SEA module identities fold only the already-resolved snapshot drive', () => {
  for (const drive of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') {
    const source = { url: `file:///${drive}:/snapshot/plugin/lib/index.js?generation=2#same`, format: 'module', shortCircuit: true };
    const result = resolver()('module', {}, () => source, false, 'file:///real/');
    assert.equal(result.url, 'file:///C:/snapshot/plugin/lib/index.js?generation=2#same');
    assert.equal(result.format, source.format); assert.equal(result.shortCircuit, true);
    assert.equal(source.url, `file:///${drive}:/snapshot/plugin/lib/index.js?generation=2#same`);
  }
});
test('physical paths, other schemes, other platforms and resolver errors remain exact', () => {
  for (const platform of ['win32', 'linux', 'darwin']) for (const url of ['file:///Q:/project/index.js',
    'file:///Q:/snapshot-other/index.js', 'file://server/share/snapshot/index.js', 'node:fs', 'data:text/javascript,export{}',
    ...(platform === 'win32' ? [] : ['file:///Q:/snapshot/plugin.js'])]) {
    const source = { url, format: 'module' };
    assert.equal(resolver(platform)('module', {}, () => source, false), source);
  }
  const error = new Error('original-resolution-failure');
  assert.throws(() => resolver()('module', {}, () => { throw error; }, false), candidate => candidate === error);
});
test('Office parent redirect and original context fields are retained', () => {
  const context = { parentURL: 'file:///Q:/snapshot/fixture/index.js', conditions: ['node'] };
  const target = 'file:///Q:/runtime-office/package.json';
  for (const office of [true, false]) resolver()('@deepseek-ai/libreoffice-kit', context, (specifier, actual) => {
    assert.equal(specifier, '@deepseek-ai/libreoffice-kit');
    assert.equal(actual.parentURL, office ? target : context.parentURL);
    assert.equal(actual.conditions, context.conditions);
    if (!office) assert.equal(actual, context);
    return { url: 'file:///Q:/runtime-office/index.js' };
  }, office, target);
});
test('bootstrap transform changes only the inspected resolver and rejects unknown anchors', () => {
  const anchor = '      return nextResolve(specifier, office ? { ...context, parentURL } : context)';
  const original = 'before\n' + anchor + '\nafter\n';
  assert.equal(transformSdkModuleIdentity(original).replace(sdkModuleIdentityResolver, anchor), original);
  for (const invalid of ['other', original + original, transformSdkModuleIdentity(original)])
    assert.throws(() => transformSdkModuleIdentity(invalid), /anchor_mismatch/);
});

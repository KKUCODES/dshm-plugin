// 复用官方桌面工程准备器与完整已验证资源；所有可写桌面状态属于独立测试home。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, access, readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';
import { readLatestSdkCarrier } from '../../backend/scripts/latest-sdk-carrier.mjs';
import { latestElectronFinalPaths } from './latest-electron-final-scope.mjs';

export async function prepareLatestElectronProject(runtime, home, {retry=false,attempt=1,encodingUpgrade=false,finalRun,overlay}={}) {
  assert.equal(runtime, resolve(import.meta.dirname, '../artifacts/latest-runtime-check'));
  const finalPaths = finalRun ? latestElectronFinalPaths(runtime, home, finalRun) : undefined;
  let lease;
  if (finalPaths) {
    assert.equal(await realpath(home), home);
    assert.ok(!retry && attempt === 1 && !encodingUpgrade);
    assert.equal(overlay, resolve(home, 'plugin.patch.json'));
    await assert.rejects(access(resolve(runtime, 'latest-live-source-lease.json')), {code:'ENOENT'});
    const receipt = JSON.parse(await readFile(resolve(import.meta.dirname, '../../dsh-mobile/artifacts/latest-mobile-runtime',
      'latest-final-electron-android-' + finalRun, 'apk-installed.json')));
    assert.equal(receipt.passed, true); assert.equal(receipt.run, finalRun); assert.equal(receipt.mode, 'electron');
    assert.equal(receipt.packageName, 'dev.dshmobile.validation.latestfinaltest');
    assert.equal(receipt.originalUidUnchanged, true);
  } else {
    assert.equal(overlay, undefined);
    assert.match(relative(resolve(runtime, 'live-homes'), await realpath(home)), /^[0-9a-f-]{36}$/);
    lease = JSON.parse(await readFile(resolve(runtime, 'latest-live-source-lease.json')));
    assert.equal(lease.state, 'ready'); assert.equal(lease.scope, encodingUpgrade ? 'electron-encoding-3' : 'electron'); assert.equal(lease.sourceCommit, sourceCommit);
  }
  assert.ok(!encodingUpgrade || !retry && attempt === 1);
  const installed = await verifyInstalledSource();
  assert.equal(installed.files, 38);
  if (lease) assert.deepEqual(installed.clientArtifacts, lease.patchedClientArtifacts);
  const installation = JSON.parse(await readFile(resolve(runtime, 'latest-electron-runtime-attempt-2.json')));
  assert.equal(installation.passed, true); assert.equal(installation.runtime.electron, '44.0.0');
  if (retry) {
    const previous = JSON.parse(await readFile(resolve(runtime,'electron-attempt-1/preparation.json')));
    const failure = JSON.parse(await readFile(resolve(runtime,'electron-attempt-1/start-diagnostic.json')));
    assert.equal(failure.home,home);assert.equal(failure.originalControllerStartFailed,true);
    assert.equal(failure.ownedCleanupRequested,true);assert.equal(failure.code,1);
    assert.throws(()=>process.kill(failure.pid,0),{code:'ESRCH'});
    assert.equal(previous.home,home);assert.equal(previous.sourceCommit,sourceCommit);
    assert.equal(previous.sourceFiles,installed.files);assert.equal(previous.executable,installation.executable);
    await assert.rejects(access(previous.readinessFile),{code:'ENOENT'});
    assert.ok([2,3,4].includes(attempt));
    if(attempt===4){
      const diagnostic=JSON.parse(await readFile(resolve(previous.directory,'start-diagnostic-attempt-2.json')));
      assert.equal(diagnostic.originalHostReadyUrl,true);assert.equal(diagnostic.mobileEndpointStatus,200);
      assert.equal(diagnostic.identityObserved,false);assert.throws(()=>process.kill(diagnostic.pid,0),{code:'ESRCH'});
      const profileRequire=createRequire(resolve(sourceRoot,'packages/boot/app-boot/package.json'));
      const yaml=profileRequire('js-yaml');
      const {entryListSchema}=await import(pathToFileURL(profileRequire.resolve('@deepseek-ai/cordis-plugin-include')));
      const patch=resolve(home,'profiles/desktop/cordis.patch.yml');const bytes=await readFile(patch);
      const rows=yaml.load(bytes.toString(),{schema:entryListSchema}), entries=rows.flatMap(row=>row.insert??[]);
      const observers=entries.filter(row=>row.id==='latest-electron-ready');assert.equal(observers.length,1);
      assert.equal(observers[0].name,pathToFileURL(resolve(import.meta.dirname,'../tests/support/latest-electron-ready.mjs')).href);
      await writeFile(resolve(previous.directory,'profile-before-fixture-metadata.yml'),bytes,{flag:'wx'});
      observers[0].name=pathToFileURL(resolve(import.meta.dirname,'../tests/support/latest-electron-ready/index.mjs')).href;
      await writeFile(patch,yaml.dump(rows,{schema:entryListSchema,noRefs:true}));
    }
    await writeFile(resolve(previous.directory,attempt===2 ? 'retry-preparation.json' : `retry-preparation-attempt-${attempt}.json`),JSON.stringify({...previous,attempt,
      originalFailedObserverRetained:true,at:new Date().toISOString()},null,2),{flag:'wx'});
    return {...previous,attempt};
  }
  const carrier = await readLatestSdkCarrier(runtime);
  const primary = resolve(carrier.root, 'win-x64/primary-runtime'); assert.equal(await realpath(primary), primary);
  if (encodingUpgrade) {
    const prior = JSON.parse(await readFile(resolve(runtime, 'latest-electron-android-attempt-1.json')));
    const restored = JSON.parse(await readFile(resolve(runtime, 'latest-electron-android-restored-check.json')));
    const native = JSON.parse(await readFile(resolve(runtime, 'latest-electron-encoding-3-console-modes.json')));
    assert.equal(prior.passed, true); assert.equal(restored.passed, true); assert.equal(prior.home, home);
    assert.equal(native.passed, true); assert.equal(native.cases.length, 3);
  }
  const directory = finalPaths?.directory ?? resolve(runtime, encodingUpgrade ? 'electron-attempt-2' : 'electron-attempt-1'); await mkdir(directory);
  assert.equal(await realpath(directory), directory);
  const project = resolve(directory, 'project'); await assert.rejects(access(project), {code:'ENOENT'});
  const app = resolve(sourceRoot, 'apps/desktop');
  const require = createRequire(resolve(app, 'package.json'));
  const { register } = await import(pathToFileURL(require.resolve('tsx/esm/api')));
  const unregister = register();
  let release;
  try {
    const { prepareDevelopmentProject } = await import(pathToFileURL(resolve(app, 'scripts/development-project.ts')));
    const { createPluginProfile } = await import(pathToFileURL(resolve(app, 'src/project-manager.ts')));
    const { DESKTOP_HOST_PROTOCOL_VERSION } = await import(pathToFileURL(resolve(app, 'src/host-protocol.ts')));
    const { smokePrimaryRuntime } = await import(pathToFileURL(resolve(app, 'scripts/prepare-primary-runtime.ts')));
    // 此接口是官方桌面资源验收，包含Python、Node、pnpm及Office依赖；不重新复制整份资源。
    smokePrimaryRuntime(primary);
    release = {schemaVersion:1,version:'0.2.1-alpha.1',hostProtocolVersion:DESKTOP_HOST_PROTOCOL_VERSION,
      nodeVersion:installation.runtime.node,pnpmVersion:'11.7.0'};
    prepareDevelopmentProject({projectDir:project,cliDir:resolve(sourceRoot,'apps/cli'),
      hostDir:resolve(sourceRoot,'apps/desktop-host'),dependencyDir:resolve(sourceRoot,'node_modules/.pnpm/node_modules'),
      release,target:'win-x64'});
    const profile = resolve(home, 'profiles/desktop');
    if (encodingUpgrade) assert.equal(await realpath(profile), profile);
    else { await assert.rejects(access(profile), {code:'ENOENT'}); createPluginProfile(profile); }
    const patch = resolve(profile, 'cordis.patch.yml');
    await writeFile(resolve(directory, 'original-profile-patch.yml'), await readFile(patch), {flag:'wx'});
    const review = resolve(runtime, 'candidate-package-check-1xqe3A');
    const integrity = JSON.parse(await readFile(resolve(review, 'source-integrity-recheck.json')));
    assert.equal(integrity.passed, true); assert.equal(integrity.currentSourcesIdentical, true);
    const plugin = resolve(review, 'consumer/node_modules/@dsh-mobile/plugin/dist/index.js');
    assert.equal(await realpath(plugin), plugin);
    assert.deepEqual(await readFile(plugin), await readFile(resolve(review, 'package/dist/index.js')));
    const rows = finalPaths ? JSON.parse(await readFile(overlay, 'utf8')) : [{insert:[{id:'dsh-mobile',name:pathToFileURL(plugin).href}]}];
    assert.ok(Array.isArray(rows));
    const entries = rows.flatMap(row => row.insert ?? []);
    assert.equal(entries.filter(row => row.id === 'dsh-mobile' && row.name === pathToFileURL(plugin).href).length, 1);
    assert.equal(entries.filter(row => row.id === 'latest-electron-ready').length, 0);
    const observer = {id:'latest-electron-ready',name:pathToFileURL(resolve(import.meta.dirname,'../tests/support/latest-electron-ready/index.mjs')).href,
      config:{reportPath:resolve(directory,'private-ready.json'),...(finalRun ? {finalRun} : {})}};
    if (finalPaths) rows.push({insert:[observer]});
    else rows[0].insert.push(observer);
    await writeFile(patch, JSON.stringify(rows));
  } finally { unregister(); }
  const port = async () => {
    const server = createServer().listen(0, '127.0.0.1'); await once(server, 'listening');
    const value = server.address().port; await new Promise(done => server.close(done)); return value;
  };
  const mainPort = await port(), rendererPort = await port(); assert.notEqual(mainPort, rendererPort);
  const executable = require('electron'); assert.equal(await realpath(executable), installation.executable);
  const userData = resolve(directory, 'user-data');
  const report = {at:new Date().toISOString(),passed:true,sourceCommit,sourceFiles:installed.files, ...(encodingUpgrade ? {attempt:2,encodingUpgrade:true} : {}),
    executable,release,directory,project,app,userData,home,primary,mainPort,rendererPort,
    ...(finalRun ? {finalRun,profilePatch:resolve(home,'profiles/desktop/cordis.patch.yml'),
      clientArtifacts:installed.clientArtifacts} : {}),
    officialPreparation:true,officialDesktopPrimarySmoke:true,reusedWholeSdkPrimary:true,
    readinessFile:resolve(directory,'private-ready.json')};
  await writeFile(resolve(directory,'preparation.json'),JSON.stringify(report,null,2),{flag:'wx'});
  return report;
}

/** 原桌面重启继续使用同一 profile，只移除本轮外加的业务夹具；身份观察器保留。 */
export async function prepareLatestFinalElectronRestart(prepared) {
  const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
  const paths = latestElectronFinalPaths(runtime, prepared.home, prepared.finalRun);
  assert.equal(prepared.directory, paths.directory);
  const original = JSON.parse(await readFile(resolve(paths.directory,'preparation.json')));
  assert.deepEqual(original, prepared); assert.equal(original.passed,true);
  const patch = resolve(prepared.home,'profiles/desktop/cordis.patch.yml');
  assert.equal(prepared.profilePatch,patch); assert.equal(await realpath(patch),patch);
  const require = createRequire(resolve(sourceRoot,'packages/boot/app-boot/package.json'));
  const yaml = require('js-yaml');
  const { entryListSchema } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis-plugin-include')));
  const bytes = await readFile(patch), rows = yaml.load(bytes.toString(), {schema:entryListSchema});
  assert.ok(Array.isArray(rows));
  const removed = ['dsh-mobile','latest-cordis-fixture','latest-preset-fault-source'];
  const entries = rows.flatMap(row=>row.insert??[]);
  for (const id of removed) assert.equal(entries.filter(row=>row.id===id).length,1);
  const observer = entries.filter(row=>row.id==='latest-electron-ready');
  assert.equal(observer.length,1); assert.equal(observer[0].config.finalRun,prepared.finalRun);
  await writeFile(resolve(paths.directory,'profile-before-restart.yml'),bytes,{flag:'wx'});
  for (const row of rows) if (row.insert) row.insert=row.insert.filter(entry=>!removed.includes(entry.id));
  await writeFile(patch,yaml.dump(rows,{schema:entryListSchema,noRefs:true}));
  const report = {at:new Date().toISOString(),passed:true,home:prepared.home,removed,
    originalDesktopProfile:true,identityObserverRetained:true};
  await writeFile(resolve(paths.directory,'restart-profile.json'),JSON.stringify(report,null,2),{flag:'wx'});
  return report;
}

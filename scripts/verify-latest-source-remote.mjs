import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { access, copyFile, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installSourceRuntime, prepareSourceRuntime, sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { installStartup } from '../compatibility/source-start/install.mjs';

const root = resolve(import.meta.dirname, '..');
const backend = resolve(root, '../backend');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const require = createRequire(resolve(sourceRoot, 'package.json'));
const flags = process.argv.slice(2);
assert.ok(flags.every(flag => ['--source-delivery', '--final-android', '--final-electron', '--page', '--android', '--office', '--office-lifetime', '--office-metadata', '--office-engine', '--office-engine-network', '--office-engine-lifecycle', '--office-engine-shared', '--office-engine-joined-cancel', '--office-cancel', '--office-recovery', '--office-authority', '--office-session', '--office-session-inflight', '--office-sidebar-inflight', '--office-file-permission', '--office-file-permission-ui', '--file-transfers', '--file-formats', '--file-picker', '--file-write-death', '--file-share-death', '--transmission', '--desktop-open', '--desktop-races', '--plugin-management', '--plugin-cancellation'].includes(flag)), 'Unknown source Remote argument');
const sourceDelivery = flags.includes('--source-delivery');
const finalAndroid = flags.includes('--final-android');
const finalElectron = flags.includes('--final-electron');
const finalCombination = finalAndroid || finalElectron;
assert.ok(!finalElectron || flags.length === 1, 'Final Electron is a separate original desktop Android scope');
assert.ok(!finalAndroid || sourceDelivery && flags.length === 2, 'Final Android requires only the standalone source delivery scope');
assert.ok(!sourceDelivery || flags.length === (finalAndroid ? 2 : 1), 'Standalone source delivery is a separate runtime scope');
const deliveryRun = sourceDelivery ? (finalAndroid ? process.env.DSHM_LATEST_FINAL_RUN : randomUUID())
  : finalElectron ? process.env.DSHM_LATEST_FINAL_RUN : undefined;
if (finalCombination) assert.match(deliveryRun, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const deliveryRoot = sourceDelivery ? resolve(process.env.DSHM_SOURCE_DELIVERY_CANDIDATE ?? '') : undefined;
if (sourceDelivery) {
  assert.ok(process.env.DSHM_SOURCE_DELIVERY_CANDIDATE, 'Choose the built standalone candidate explicitly');
  await assert.rejects(access(resolve(runtime, 'latest-live-source-lease.json')), { code: 'ENOENT' });
  const receipt = JSON.parse(await readFile(resolve(deliveryRoot, 'build-report.json'), 'utf8'));
  assert.equal(receipt.sourceCommit, sourceCommit); assert.equal(receipt.sourceFiles, 38);
}
const officeEngine = flags.includes('--office-engine');
const officeMetadata = flags.includes('--office-metadata');
assert.ok(!officeMetadata || flags.includes('--office-lifetime') &&
  !['--office-engine', '--office-cancel', '--file-transfers', '--transmission'].some(flag => flags.includes(flag)),
  'Office metadata requires a separate actual Android preview scope');
assert.ok(!flags.includes('--office-engine-lifecycle') || officeEngine &&
  !['--office-engine-network', '--office-engine-joined-cancel', '--office-cancel', '--file-transfers'].some(flag => flags.includes(flag)),
  'Engine service and revocation validation requires a separate native reader scope');
assert.ok(!flags.includes('--office-engine-network') || officeEngine &&
  !['--office-engine-shared', '--office-cancel', '--file-transfers'].some(flag => flags.includes(flag)),
  'Engine network recovery requires a separate single native reader scope');
const fileFormats = flags.includes('--file-formats');
assert.ok(!fileFormats || (flags.includes('--file-transfers') && !['--office-engine', '--file-picker', '--file-write-death', '--file-share-death'].some(flag => flags.includes(flag))),
  'Office original format validation requires a separate file transfer scope');
assert.ok(!flags.includes('--office-engine-shared') || officeEngine, 'Shared engine validation requires the original native engine scope');
assert.ok(!flags.includes('--office-engine-joined-cancel') || flags.includes('--office-engine-shared'),
  'Joined reader cancellation requires the shared original engine scope');
assert.ok(!officeEngine || flags.includes('--office-lifetime'), 'Native engine validation requires the isolated Office Android scope');
assert.ok(!flags.includes('--desktop-open') || flags.includes('--android'), 'Desktop launch validation requires Android');
assert.ok(!flags.includes('--office-lifetime') || (flags.includes('--android') && flags.includes('--office')),
  'Office lifetime validation requires the isolated Android package and Office fixtures');
assert.ok(!flags.includes('--office-cancel') || flags.includes('--office-lifetime'),
  'Office cancellation validation requires the dedicated Office lifetime scope');
const packageCancellation = flags.includes('--plugin-cancellation');
assert.ok(!flags.includes('--office-recovery') || flags.includes('--office-cancel'),
  'Office network recovery requires the dedicated in-flight reader scope');
assert.ok(!flags.includes('--office-authority') || flags.includes('--office-recovery'),
  'Office authorization validation requires the dedicated recovery scope');
assert.ok(!flags.includes('--office-session') || flags.includes('--office-recovery'),
  'Office session validation requires the dedicated recovery scope');
assert.ok(!flags.includes('--office-session-inflight') || flags.includes('--office-session'),
  'Office session in-flight validation requires the actual session fixtures');
assert.ok(!flags.includes('--office-sidebar-inflight') || flags.includes('--office-session-inflight'),
  'Office sidebar in-flight validation requires the retained tab and session fixtures');
const packageManagement = flags.includes('--plugin-management') || packageCancellation;
assert.ok(!flags.includes('--office-file-permission') || flags.includes('--transmission'),
  'Office file permission validation requires actual PDF transmission');
assert.ok(!flags.includes('--office-file-permission-ui') || flags.includes('--office-recovery'),
  'Office file permission UI validation requires the isolated recovery scope');
assert.ok(!flags.includes('--file-transfers') || flags.includes('--office-lifetime'),
  'File transfer validation requires the isolated Office Android package');
assert.ok(!flags.includes('--file-picker') || flags.includes('--file-transfers'),
  'File picker validation requires the original file transfer fixture');
assert.ok(!flags.includes('--file-write-death') || (flags.includes('--file-transfers') && !flags.includes('--file-picker')),
  'Destination write death validation is a separate file transfer scope');
assert.ok(!flags.includes('--file-share-death') || (flags.includes('--file-transfers') && !flags.includes('--file-picker') && !flags.includes('--file-write-death')),
  'Share preparation death validation is a separate file transfer scope');
assert.ok(!packageManagement || flags.length === 1, 'Plugin management is a separate Android validation scope');
const git = (...args) => execFileSync('git', args, { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), sourceCommit);
assert.equal(git('status', '--porcelain'), '');
const manifest = await prepareSourceRuntime();
const originals = await Promise.all(manifest.files.map(file => readFile(resolve(sourceRoot, file.path))));
const rootPackage = await readFile(resolve(sourceRoot, 'package.json'));
const originalBuild = JSON.parse(await readFile(resolve(sourceRoot, '.dsh-build/client-build-environment.json'), 'utf8'));
const env = { DSH_TELEMETRY_DISABLED: '1', DSHM_LATEST_SOURCE_CHECK: '1' };
if (finalElectron) { delete env.DSHM_LATEST_SOURCE_CHECK; env.DSHM_LATEST_ELECTRON_CHECK = '1'; }
if (sourceDelivery && !finalAndroid) env.DSHM_LATEST_DELIVERY_RUN = deliveryRun;
if (finalCombination) {
  env.DSHM_LATEST_FINAL_RUN = deliveryRun;
  env.DSHM_LATEST_FINAL_MODE = finalElectron ? 'electron' : 'source';
  env.DSHM_LATEST_ANDROID_CHECK = '1';
}
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
if (flags.includes('--android') || packageManagement || finalCombination) {
  for (const key of ['DSHM_ANDROID_SERIAL', 'DSHM_ADB_PATH']) {
    assert.ok(process.env[key], `Android validation requires ${key}`);
    env[key] = process.env[key];
  }
}
if (finalCombination) {
  const { latestFinalScope } = await import('../../dsh-mobile/scripts/latest-final-test-scope.mjs');
  const scope = latestFinalScope(env);
  const receipt = JSON.parse(await readFile(resolve(root, '../dsh-mobile/artifacts/latest-mobile-runtime',
    scope.reportName, 'apk-installed.json'), 'utf8'));
  assert.equal(receipt.run, deliveryRun); assert.equal(receipt.passed, true);
  assert.equal(receipt.packageName, scope.packageName); assert.equal(receipt.mode, scope.mode);
  if (finalElectron) await assert.rejects(access(resolve(runtime, 'latest-live-source-lease.json')), {code:'ENOENT'});
}
for (const [flag, key] of [['--page', 'DSHM_LATEST_PAGE_CHECK'], ['--android', 'DSHM_LATEST_ANDROID_CHECK'],
  ['--office', 'DSHM_LATEST_OFFICE_CHECK'], ['--office-lifetime', 'DSHM_LATEST_OFFICE_LIFETIME_CHECK'],
  ['--office-metadata', 'DSHM_LATEST_OFFICE_METADATA_CHECK'],
  ['--office-engine', 'DSHM_LATEST_OFFICE_ENGINE_CHECK'],
  ['--office-engine-network', 'DSHM_LATEST_OFFICE_ENGINE_NETWORK_CHECK'],
  ['--office-engine-lifecycle', 'DSHM_LATEST_OFFICE_ENGINE_LIFECYCLE_CHECK'],
  ['--office-engine-shared', 'DSHM_LATEST_OFFICE_ENGINE_SHARED_CHECK'],
  ['--office-engine-joined-cancel', 'DSHM_LATEST_OFFICE_ENGINE_JOINED_CANCEL_CHECK'],
  ['--office-cancel', 'DSHM_LATEST_OFFICE_CANCEL_CHECK'],
  ['--office-recovery', 'DSHM_LATEST_OFFICE_RECOVERY_CHECK'],
  ['--office-authority', 'DSHM_LATEST_OFFICE_AUTHORITY_CHECK'],
  ['--office-session', 'DSHM_LATEST_OFFICE_SESSION_CHECK'],
  ['--office-session-inflight', 'DSHM_LATEST_OFFICE_SESSION_INFLIGHT_CHECK'],
  ['--office-sidebar-inflight', 'DSHM_LATEST_OFFICE_SIDEBAR_INFLIGHT_CHECK'],
  ['--office-file-permission', 'DSHM_LATEST_OFFICE_FILE_PERMISSION_CHECK'],
  ['--office-file-permission-ui', 'DSHM_LATEST_OFFICE_FILE_PERMISSION_UI_CHECK'],
  ['--file-transfers', 'DSHM_LATEST_FILE_TRANSFERS_CHECK'],
  ['--file-formats', 'DSHM_LATEST_FILE_FORMATS_CHECK'],
  ['--file-picker', 'DSHM_LATEST_FILE_PICKER_CHECK'],
  ['--file-write-death', 'DSHM_LATEST_FILE_WRITE_DEATH_CHECK'],
  ['--file-share-death', 'DSHM_LATEST_FILE_SHARE_DEATH_CHECK'],
  ['--transmission', 'DSHM_LATEST_OFFICE_TRANSMISSION_CHECK']])
  if (flags.includes(flag)) env[key] = '1';
if (flags.includes('--transmission')) env.DSHM_LATEST_OFFICE_CHECK = '1';
if (flags.includes('--desktop-open') || flags.includes('--desktop-races') || flags.includes('--office-file-permission') || flags.includes('--office-file-permission-ui')) {
  assert.ok(process.env.DSHM_PWSH_PATH, 'Desktop launch validation requires the inspected PowerShell binary');
  env.DSHM_PWSH_PATH = process.env.DSHM_PWSH_PATH;
  if (flags.includes('--desktop-open')) env.DSHM_LATEST_DESKTOP_OPEN_CHECK = '1';
  if (flags.includes('--desktop-races')) env.DSHM_LATEST_DESKTOP_RACE_CHECK = '1';
}
if (packageManagement) env.DSHM_LATEST_PLUGIN_INSTALL_CHECK = '1';
if (packageCancellation) env.DSHM_LATEST_PLUGIN_CANCEL_CHECK = '1';
const report = { at: new Date().toISOString(), sourceCommit, command: finalElectron ? 'official Electron desktop main' : 'pnpm dsh web',
  flags, patches: manifest.patches, files: manifest.files.length, buildHeap: 'node-default', stages: [], passed: false };
const uniqueReports = officeMetadata || officeEngine || fileFormats || sourceDelivery || finalElectron;
const reportBase = officeMetadata ? 'latest-source-office-metadata-run-' + randomUUID() : finalElectron ? 'latest-final-electron-run-' + deliveryRun : sourceDelivery ? 'latest-source-delivery-' + (finalAndroid ? 'android-' : '') + 'run-' + deliveryRun : officeEngine ? 'latest-source-office-engine-run-' + randomUUID()
  : fileFormats ? 'latest-source-file-formats-run-' + randomUUID() : packageCancellation ? 'latest-source-plugin-cancellation-combined' : packageManagement ? 'latest-source-plugin-management' : 'latest-source-remote';
const scopeReportsBefore = uniqueReports ? new Set(await readdir(runtime)) : undefined;
const save = () => writeFile(resolve(runtime, reportBase + '.json'), JSON.stringify(report, null, 2) + '\n');
const run = async (name, args, cwd, limit = 900000, childEnv = env) => {
  const started = Date.now();
  const child = spawn(process.execPath, args, { cwd, env: childEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', timedOut = false;
  child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  const stop = () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { cwd, windowsHide: true, stdio: 'ignore' });
    else child.kill();
  };
  const timer = setTimeout(() => { timedOut = true; stop(); }, limit);
  try {
    const code = await new Promise((done, fail) => { child.once('error', fail); child.once('close', done); });
    // 测试失败也不记录登录地址、一次性配对链接或凭据正文。
    await writeFile(resolve(runtime, uniqueReports ? `${reportBase}-${name}.log` : `latest-source-${name}.log`), output.replace(/https?:\/\/\S+/g, '[URL]'));
    report.stages.push({ name, code, timedOut, elapsedMs: Date.now() - started });
    await save();
    console.log(JSON.stringify({ stage: name, code, timedOut, elapsedMs: Date.now() - started }));
    if (code !== 0 || timedOut) throw Error(`latest_source_remote_stage_failed: ${name}`);
  } finally { clearTimeout(timer); }
};
const build = name => run(name, [resolve(sourceRoot, 'node_modules/pnpm/bin/pnpm.cjs'), 'run', 'build'], sourceRoot);
const check = name => run(name, ['--import', pathToFileURL(require.resolve('tsx/esm')).href,
  resolve(root, 'scripts/check-latest-source.mjs'), '--built'], root, 30000);
let runtimeApplied = false, startupApplied = false, buildStarted = false;
const deliveryInstall = action => JSON.parse(execFileSync(process.execPath, [resolve(deliveryRoot, 'install.mjs'), action, sourceRoot],
  { cwd: root, encoding: 'utf8', windowsHide: true, env: { ...env, NODE_OPTIONS: '', NODE_PATH: '' } }));
try {
  await check('baseline-build-check');
  if (sourceDelivery) {
    assert.equal(deliveryInstall('plan').state, 'original');
    report.deliveryApply = deliveryInstall('apply'); runtimeApplied = startupApplied = true;
    assert.equal(report.deliveryApply.written, manifest.files.length + 3);
    assert.equal(deliveryInstall('apply').written, 0);
  } else {
  report.runtimeApply = await installSourceRuntime('apply', sourceRoot); runtimeApplied = true;
  assert.equal(report.runtimeApply.written, manifest.files.length);
  assert.equal((await installSourceRuntime('apply', sourceRoot)).written, 0);
  report.startupApply = await installStartup('apply', sourceRoot); startupApplied = true;
  assert.equal(report.startupApply.written, 3);
  assert.equal((await installStartup('apply', sourceRoot)).written, 0);
  }
  await save();
  buildStarted = true;
  await build('patched-build');
  const unitEnv = { ...env, DSHM_LATEST_SOURCE_ROOT: sourceRoot, DSHM_SOURCE_ROOT: sourceRoot,
    TSX_TSCONFIG_PATH: resolve(sourceRoot, 'tsconfig.json') };
  // 运行真实构建出的执行器和ACL runner，不能用测试子类或继承65001掩盖中文系统乱码。
  if (!sourceDelivery) await run('pwsh-encoding', [resolve(root, 'scripts/verify-latest-pwsh-encoding.mjs')], root, 60000,
    { ...env, DSHM_RUN_LIVE: '1', DSHM_ENCODING_SOURCE: '1', DSHM_ENCODING_VARIANT: 'installed', DSHM_PRIVATE_CONSOLE: '1' });
  await run('source-units', ['--import', pathToFileURL(require.resolve('tsx/esm')).href,
    '--import', pathToFileURL(resolve(sourceRoot, '.dshm-source/bootstrap.mjs')).href, '--test',
    'tests/latest-pending-notifications.test.mjs', 'tests/latest-preset-archive.test.mjs', 'tests/latest-model-discovery.test.mjs',
    'tests/latest-client-entries.test.mjs', 'tests/latest-cordis-client-lifetime.test.mjs', 'tests/latest-cordis-scopes.test.mjs',
    'tests/latest-command-output.test.mjs', 'tests/latest-tool-cancellation.test.mjs', 'tests/latest-ptc-process.test.mjs',
    'tests/latest-file-watch.test.mjs'], root, 180000, unitEnv);
  // 独立交付专项只复验当前安装/完整构建/源码函数/真实网关；旧专项的固定报告保持原位。
  if (!sourceDelivery) {
  await run('tool-cancellation', [resolve(root, 'scripts/verify-latest-tool-cancellation.mjs'), '--installed'], root, 60000);
  report.toolCancellation = JSON.parse(await readFile(resolve(runtime, 'tool-cancellation/installed-report.json'), 'utf8'));
  assert.equal(report.toolCancellation.passed, true);
  assert.equal(report.toolCancellation.mode, 'installed');
  await run('plugin-restart', [resolve(root, 'scripts/verify-latest-plugin-restart.mjs'), '--installed'], root, 90000);
  report.pluginRestart = JSON.parse(await readFile(resolve(runtime, 'plugin-restart/installed-report.json'), 'utf8'));
  assert.equal(report.pluginRestart.passed, true);
  assert.equal(report.pluginRestart.mode, 'installed');
  await run('package-process', [resolve(root, 'scripts/verify-latest-package-process.mjs'), '--source-installed'], root, 90000);
  report.packageProcess = JSON.parse(await readFile(resolve(runtime, 'package-process/source-installed-report.json'), 'utf8'));
  assert.equal(report.packageProcess.passed, true);
  assert.equal(report.packageProcess.mode, 'source-installed');
  // 保留原业务断言，替身只解开新增载体；真实Job另由进程专项证明。
  await run('package-operations', [resolve(root, 'scripts/verify-latest-package-range-regressions.mjs'), '--combined'], root, 90000);
  await run('installed-identity', [resolve(root, 'scripts/verify-latest-source-identity.mjs'), '--installed'], root, 90000);
  report.identity = JSON.parse(await readFile(resolve(runtime, 'latest-source-identity-installed.json'), 'utf8'));
  assert.equal(report.identity.cases.length, 1);
  assert.equal(report.identity.cases[0].mode, 'installed');
  assert.equal(report.identity.cases[0].passed, true);
  await run('desktop-apps', ['--import', pathToFileURL(require.resolve('tsx/esm')).href,
    '--import', pathToFileURL(resolve(sourceRoot, '.dshm-source/bootstrap.mjs')).href,
    '--test', 'tests/latest-desktop-apps.test.mjs'], root, 60000,
    { ...unitEnv, DSHM_LATEST_DESKTOP_MODE: 'source' });
  }
  if (fileFormats) {
    for (const group of ['word-and-xlsx', 'xls-and-slides'])
      await run('file-formats-' + group + '-relay', [resolve(backend, 'node_modules/vitest/vitest.mjs'), 'run',
        'tests/latest-host.test.ts', '--maxWorkers=1', '--no-file-parallelism'], backend, 660000,
        { ...env, DSHM_LATEST_FILE_FORMATS_GROUP: group });
  } else await run(packageCancellation ? 'plugin-cancellation-relay' : packageManagement ? 'plugin-management-relay' : 'relay', [resolve(backend, 'node_modules/vitest/vitest.mjs'), 'run',
    packageManagement ? 'tests/latest-plugin-upgrade.test.ts' : 'tests/latest-host.test.ts'], backend, packageManagement || flags.includes('--android') || finalCombination ? 360000 : 210000);
  let relayName = packageCancellation ? 'latest-source-plugin-cancellation.json' : packageManagement ? 'latest-source-plugin-upgrade.json' : 'latest-source-relay-test.json';
  if (uniqueReports) {
    const pattern = finalElectron ? new RegExp(`^latest-final-electron-android-${deliveryRun}-test\\.json$`)
      : finalAndroid ? new RegExp(`^latest-final-source-android-${deliveryRun}-test\\.json$`)
      : sourceDelivery ? new RegExp(`^latest-source-delivery-${deliveryRun}-test\\.json$`)
      : officeMetadata ? /^latest-source-office-metadata-[0-9a-f-]+-test\.json$/
      : officeEngine ? /^latest-source-office-engine-[0-9a-f-]+-test\.json$/ : /^latest-source-file-formats-[0-9a-f-]+-test\.json$/;
    const fresh = (await readdir(runtime)).filter(name => pattern.test(name) && !scopeReportsBefore.has(name));
    assert.equal(fresh.length, fileFormats ? 2 : 1, 'Source scope must consume only its own fresh relay reports');
    if (fileFormats) {
      report.fileFormatRelays = await Promise.all(fresh.map(async name => ({ name,
        result: JSON.parse(await readFile(resolve(runtime, name), 'utf8')) })));
      assert.deepEqual(report.fileFormatRelays.map(item => item.result.fileFormatGroup).sort(), ['word-and-xlsx', 'xls-and-slides']);
      for (const { result } of report.fileFormatRelays) {
        assert.equal(result.passed, true); assert.equal(result.executionMode, 'source');
        assert.equal(result.command, 'pnpm dsh web'); assert.equal(result.reviewedPackage.files, 62);
      }
    }
    relayName = fresh[0];
  }
  report.relayReport = relayName;
  report.relay = JSON.parse(await readFile(resolve(runtime, relayName), 'utf8'));
  assert.equal(report.relay.passed, true);
  assert.equal(report.relay.executionMode, finalElectron ? 'electron' : 'source');
  assert.equal(report.relay.command, finalElectron ? 'official Electron desktop main' : 'pnpm dsh web');
  if (finalElectron) {
    assert.equal(report.relay.reviewedPackage.files,62);
    assert.equal(report.relay.finalAndroidRun,deliveryRun);
    assert.equal(report.relay.android.packageName,'dev.dshmobile.validation.latestfinaltest');
    assert.equal(report.relay.android.passed,true); assert.equal(report.relay.android.nativeRevocationObserved,true);
    assert.equal(report.relay.electronCarrier.officialPreparation,true);
    assert.equal(report.relay.electronCarrier.officialDesktopPrimarySmoke,true);
    assert.equal(report.relay.electronIdentity.parentPid,report.relay.pid);
    assert.equal(report.relay.electronRestartProfile.passed,true);
    assert.equal(report.relay.presetArchivedSessionResumedAfterRestartWithoutPlugin,true);
    const cleanup = JSON.parse(await readFile(resolve(runtime,report.relay.reportName+'-cleanup.json')));
    assert.equal(cleanup.cleanupCompleted,true); assert.equal(cleanup.ownedDesktopHostPids.length,2);
    for (const pid of [...cleanup.ownedHostPids,...cleanup.ownedDesktopHostPids])
      assert.throws(()=>process.kill(pid,0),error=>error.code==='ESRCH');
  }
  if (sourceDelivery) {
    assert.equal(report.relay.reviewedPackage.files, 62);
    if (finalAndroid) {
      assert.equal(report.relay.finalAndroidRun, deliveryRun);
      assert.equal(report.relay.android.packageName, 'dev.dshmobile.validation.latestfinaltest');
      assert.equal(report.relay.android.passed, true);
      assert.equal(report.relay.android.nativeRevocationObserved, true);
    } else assert.equal(report.relay.deliveryRun, deliveryRun);
  }
  if (flags.includes('--office-engine-joined-cancel')) {
    assert.equal(report.relay.android.scope, 'office-native-engine-joined-reader-cancellation');
    assert.equal(report.relay.android.fileRefresh.officeCache.sharedEngineCancellation.joinedRelayCancelledOnlyOwnReader, true);
    assert.equal(report.relay.android.fileRefresh.officeCache.sharedEngineCancellation.originalPhoneReaderCompletedActualPdfCanvasAndText, true);
  }
  if (flags.includes('--office-engine-network')) {
    assert.equal(report.relay.android.scope, 'office-native-engine-network-recovery');
    const network = report.relay.android.fileRefresh.officeCache.engineNetworkRecovery;
    assert.equal(network.originalEngineRunningAtUnexpectedSocketLoss, true);
    assert.equal(network.oldHelperExitedAndQueueReleased, true);
    assert.equal(network.automaticNativeConnectionRecovery, true);
    assert.equal(network.originalFailedPreviewRetainedWithoutResend, true);
    assert.equal(network.originalRetryOpenedFreshConversionCanvasAndText, true);
  }
  if (flags.includes('--office-engine-lifecycle')) {
    const shared = flags.includes('--office-engine-shared');
    assert.equal(report.relay.android.scope, shared ? 'office-native-engine-shared-service-and-revocation' : 'office-native-engine-service-and-revocation');
    const service = report.relay.android.fileRefresh.officeCache.engineServiceLifecycle;
    assert.equal(service.originalNativeHelperRunningAtUnload, true);
    assert.equal(service.unloadedHelperAndOldCacheReleased, true);
    assert.equal(service.oldRequestNotResentAfterServiceEnable, true);
    assert.equal(service.retryUsedNewServiceActualPdfCanvasAndText, true);
    if (shared) {
      assert.equal(service.joined.singleConversionSharedByTwoReaders, true);
      assert.equal(service.otherReader.otherReaderFailedWithoutPdfAtOriginalServiceUnload, true);
    }
    const revocation = report.relay.android.officeEngineRevocation;
    assert.equal(revocation.originalNativeHelperRunningAtRevocation, true);
    if (shared) {
      assert.equal(revocation.joined.singleConversionSharedByTwoReaders, true);
      assert.equal(revocation.remaining.unaffectedApprovedReaderKeptOriginalHelperAlive, true);
      assert.equal(revocation.stopped.unaffectedApprovedReaderReceivedCompleteActualPdf, true);
      assert.equal(revocation.stopped.completedHelperAndQueueReleased, true);
      assert.equal(revocation.revokedPhoneReaderReleasedOnlyOwnRequest, true);
      assert.equal(revocation.otherApprovedReaderCompletedOriginalPdf, true);
    } else assert.equal(revocation.revokedHelperAndQueueReleased, true);
    assert.equal(revocation.oldPreviewRemovedWithoutResultOrResend, true);
    assert.equal(revocation.revokedReconnectDenied, true);
  }
  if (officeMetadata) {
    assert.equal(report.relay.android.scope, 'office-same-size-mtime-and-version-cache');
    assert.equal(report.relay.android.passed, true);
    assert.equal(report.relay.android.nativeRevocationObserved, true);
    const metadata = report.relay.android.fileRefresh.officeCache.sameSizeAndMtime;
    assert.equal(metadata.changedAndRestoredPdfTextVerified, true);
    assert.equal(metadata.unchangedVersionReusedWithoutConversion, true);
    assert.equal(metadata.changed.bytes, metadata.restored.bytes);
    assert.equal(metadata.changed.mtimeNs, metadata.restored.mtimeNs);
    for (const entry of [metadata.changed, metadata.restored]) {
      assert.equal(entry.sameFileIdentity, true);
      assert.notEqual(entry.beforeCtimeNs, entry.afterCtimeNs);
      assert.notEqual(entry.beforeVersion, entry.afterVersion);
    }
  }
  report.passed = true;
} catch (error) { report.error = error.message; throw error; }
finally {
  try {
    if (sourceDelivery && runtimeApplied) {
      report.deliveryRestore = deliveryInstall('restore');
      assert.equal(deliveryInstall('restore').written, 0);
      assert.equal(deliveryInstall('plan').state, 'original');
    } else if (runtimeApplied) {
      report.runtimeRestore = await installSourceRuntime('restore', sourceRoot);
      assert.equal((await installSourceRuntime('restore', sourceRoot)).written, 0);
    }
    if (startupApplied && !sourceDelivery) {
      report.startupRestore = await installStartup('restore', sourceRoot);
      assert.equal((await installStartup('restore', sourceRoot)).written, 0);
    }
    for (const [index, file] of manifest.files.entries()) assert.deepEqual(await readFile(resolve(sourceRoot, file.path)), originals[index]);
    assert.deepEqual(await readFile(resolve(sourceRoot, 'package.json')), rootPackage);
    for (const file of ['register.mjs', 'bootstrap.mjs']) await assert.rejects(access(resolve(sourceRoot, '.dshm-source', file)), { code: 'ENOENT' });
    assert.equal(git('status', '--porcelain'), '');
    report.restoredOriginalBytes = true;
    // 源码已恢复仍不足以恢复客户端编译产物；原完整构建与摘要必须再核验。
    if (buildStarted) await build('restored-build');
    await check('restored-build-check');
    const restoredBuild = JSON.parse(await readFile(resolve(sourceRoot, '.dsh-build/client-build-environment.json'), 'utf8'));
    assert.deepEqual(restoredBuild.artifacts, originalBuild.artifacts);
    report.restoredOriginalClientArtifacts = restoredBuild.artifacts;
  } catch (error) { report.passed = false; report.restoreError = error.message; throw error; }
  finally {
    await save();
    await copyFile(resolve(outputRoot, 'manifest.json'), resolve(runtime, reportBase + '-manifest.json'));
  }
}
console.log(JSON.stringify({ passed: report.passed, sourceCommit, flags, stages: report.stages,
  restoredOriginalBytes: report.restoredOriginalBytes, restoredOriginalClientArtifacts: report.restoredOriginalClientArtifacts }));

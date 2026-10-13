// 只记录官方 Host 的实际进程身份，不读取凭据或替换认证、IPC、应用行为。
import assert from 'node:assert/strict';
import { writeFile, realpath } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { latestElectronFinalPaths } from '../../scripts/latest-electron-final-scope.mjs';
export const name = 'latest-electron-ready';
export async function apply(_ctx, config) {
      const runtime = resolve(import.meta.dirname, '../../artifacts/latest-runtime-check');
      const home = await realpath(process.env.DSH_HOME);
      if (config.finalRun) {
        assert.equal(config.finalRun, process.env.DSHM_LATEST_FINAL_RUN);
        assert.equal(config.reportPath, latestElectronFinalPaths(runtime,home,config.finalRun).readinessFile);
      } else {
        assert.ok(['electron-attempt-1', 'electron-attempt-2'].some(attempt => config.reportPath === resolve(runtime, attempt, 'private-ready.json')));
        assert.match(relative(resolve(runtime,'live-homes'),home), /^[0-9a-f-]{36}$/);
      }
      assert.equal(await realpath(dirname(config.reportPath)), dirname(config.reportPath));
      const identity={home,hostPid:process.pid,parentPid:process.ppid,
        electron:process.versions.electron,node:process.versions.node};
      await writeFile(resolve(dirname(config.reportPath),`host-identity-${process.pid}.json`),JSON.stringify(identity),{flag:'wx'});
      console.log('dshm electron identity: ' + JSON.stringify(identity));
}

// 通过官方单实例启动入口唤回已有窗口，不调用检查器修改窗口或启动第二个 Host。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const runtime=resolve(import.meta.dirname,'../artifacts/latest-runtime-check');
const state=JSON.parse(await readFile(resolve(runtime,'latest-live-state.json')));
assert.equal(state.executionMode,'electron');assert.ok(state.electronCarrier.attempt === 4 || state.electronCarrier.attempt === 2 && state.electronCarrier.encodingUpgrade === true);
process.kill(state.hostPid,0);process.kill(state.electronCarrier.electronHostPid,0);
const inspected=JSON.parse(await readFile(resolve(state.electronCarrier.directory,'workspace-wait-inspection.json')));
assert.equal(inspected.mainPid,state.hostPid);assert.equal(inspected.backend.phase,'ready');assert.equal(inspected.workspace.enteredWorkspace,true);
const file=resolve(state.electronCarrier.directory,'official-activation.json');await assert.rejects(access(file),{code:'ENOENT'});
const child=spawn(state.electronCarrier.executable,[`--user-data-dir=${state.electronCarrier.userData}`,state.electronCarrier.app],{
  cwd:state.electronCarrier.app,windowsHide:true,stdio:'ignore',env:{...process.env,DSH_HOME:state.home,DSH_DESKTOP_DSH_DIR:state.electronCarrier.project,DSH_DESKTOP_PRIMARY_RUNTIME_DIR:state.electronCarrier.primary,DSH_DESKTOP_OPEN_DEVTOOLS:'0'},
});
const outcome=await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('official_second_instance_timeout')),15000);child.once('error',fail);child.once('exit',(code,signal)=>{clearTimeout(timer);done({code,signal});});});
assert.equal(outcome.code,0);process.kill(state.hostPid,0);process.kill(state.electronCarrier.electronHostPid,0);
const report={at:new Date().toISOString(),officialSingleInstanceActivation:true,originalMainPid:state.hostPid,originalHostPid:state.electronCarrier.electronHostPid,activationPid:child.pid,...outcome};
await writeFile(file,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));

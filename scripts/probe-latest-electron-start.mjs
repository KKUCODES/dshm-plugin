// 首轮就绪观察失败后的独立启动诊断；原日志仅存本机忽略目录，不输出凭据或正文。
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
assert.ok(process.argv.length===2 || process.argv.length===3 && process.argv[2]==='--attempt-2');
const second=process.argv[2]==='--attempt-2';
const runtime = resolve(import.meta.dirname,'../artifacts/latest-runtime-check');
const preparation = JSON.parse(await readFile(resolve(runtime,'electron-attempt-1/preparation.json')));
const state = JSON.parse(await readFile(resolve(runtime,'latest-live-state.json')));
assert.equal(state.executionMode,'release');assert.equal(state.home,preparation.home);
const cleanup = JSON.parse(await readFile(resolve(state.home,'cleanup.json')));
assert.equal(cleanup.stopped,true);if(!second)assert.equal(cleanup.hostPid,48200);
const dead = pid => assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});
for(const pid of [state.hostPid,state.supervisorPid,cleanup.hostPid])dead(pid);
const previousExit = JSON.parse(await readFile(resolve(state.home,`host-exit-${cleanup.hostPid}.json`)));
assert.equal(previousExit.executionMode,'electron');assert.equal(previousExit.stopRequested,true);
const suffix=second ? '-attempt-2' : '';
const file = resolve(runtime,`electron-attempt-1/start-diagnostic${suffix}.json`);await assert.rejects(access(file),{code:'ENOENT'});
const env={DSH_HOME:state.home,DSH_TELEMETRY_DISABLED:'1',DSH_DESKTOP_DSH_DIR:preparation.project,
  DSH_DESKTOP_PRIMARY_RUNTIME_DIR:preparation.primary,DSH_DESKTOP_OPEN_DEVTOOLS:'0',
  DSH_DESKTOP_DIAGNOSTIC_FILE:resolve(preparation.directory,'private-diagnostic-error.txt')};
for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','COMSPEC','APPDATA','LOCALAPPDATA','USERPROFILE','HOMEDRIVE','HOMEPATH','PROGRAMFILES'])
  if(process.env[key]!==undefined)env[key]=process.env[key];
const child=spawn(preparation.executable,[`--inspect=127.0.0.1:${preparation.mainPort}`,
  `--remote-debugging-port=${preparation.rendererPort}`,`--user-data-dir=${preparation.userData}`,preparation.app],
{cwd:preparation.app,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let stdout='',stderr='';child.stdout.on('data',x=>{stdout+=x});child.stderr.on('data',x=>{stderr+=x});
const closed=new Promise((done,fail)=>{child.once('close',code=>done(code));child.once('error',fail)});
console.log(JSON.stringify({diagnosticPid:child.pid,running:true}));
let originalLogin;
const report={at:new Date().toISOString(),home:state.home,pid:child.pid,previousExit,
  originalControllerStartFailed:true};
try {
if(second){
  const until=Date.now()+30000;
  while(Date.now()<until && child.exitCode===null){
    originalLogin=stdout.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
    if(originalLogin)break;await new Promise(done=>setTimeout(done,100));
  }
}else await Promise.race([closed,new Promise(done=>setTimeout(done,30000))]);
report.alreadyExited=child.exitCode!==null;
if(second && originalLogin){
  const login=await fetch(originalLogin,{redirect:'manual',signal:AbortSignal.timeout(10000)});
  report.loginStatus=login.status;assert.equal(login.status,303);
  const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
  const response=await fetch(new URL('/api/dsh-mobile',originalLogin),{headers:{cookie},signal:AbortSignal.timeout(10000)});
  report.mobileEndpointStatus=response.status;
  if(response.status===200){const value=await response.json();report.mobileState={configured:value.configured,connection:value.connection,origin:value.origin};}
  report.originalHostReadyUrl=true;report.identityObserved=/dshm electron identity: /.test(stdout);
}
} catch(error) {report.failure={name:error.name,code:error.code};process.exitCode=1;}
finally {
if(child.exitCode===null){execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{cwd:preparation.app,windowsHide:true,stdio:'ignore'});report.ownedCleanupRequested=true;}
report.code=await closed;dead(child.pid);
await writeFile(resolve(preparation.directory,`private-start-diagnostic${suffix}.stdout`),stdout,{flag:'wx',mode:0o600});
await writeFile(resolve(preparation.directory,`private-start-diagnostic${suffix}.stderr`),stderr,{flag:'wx',mode:0o600});
await writeFile(file,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({pid:report.pid,code:report.code,alreadyExited:report.alreadyExited,ownedCleanupRequested:report.ownedCleanupRequested,
  originalHostReadyUrl:report.originalHostReadyUrl,mobileEndpointStatus:report.mobileEndpointStatus,mobileState:report.mobileState,identityObserved:report.identityObserved}));
}

// 使用独立实例已有的本机开发检查接口，只读取窗口状态，不显示/修改窗口或读取页面内容。
import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const runtime=resolve(import.meta.dirname,'../artifacts/latest-runtime-check');
const state=JSON.parse(await readFile(resolve(runtime,'latest-live-state.json')));
assert.equal(state.executionMode,'electron');const carrier=state.electronCarrier;
assert.ok(carrier.attempt === 4 || carrier.attempt === 2 && carrier.encodingUpgrade === true);process.kill(state.hostPid,0);process.kill(carrier.electronHostPid,0);
const afterActivation=process.argv.slice(2).includes('--after-activation');
assert.ok(process.argv.slice(2).every(arg=>arg==='--after-activation'));
const file=resolve(carrier.directory,afterActivation?'main-window-after-activation.json':'main-window-inspection.json');await assert.rejects(access(file),{code:'ENOENT'});
const list=await (await fetch(`http://127.0.0.1:${carrier.mainPort}/json/list`,{signal:AbortSignal.timeout(3000)})).json();
assert.equal(list.length,1);assert.equal(list[0].type,'node');
const url=new URL(list[0].webSocketDebuggerUrl);assert.equal(url.hostname,'127.0.0.1');assert.equal(Number(url.port),carrier.mainPort);
const ws=new WebSocket(url);await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
try{
  const expression=`(()=>{const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');return {pid:process.pid,electron:process.versions.electron,ready:e.app.isReady(),version:e.app.getVersion(),windows:e.BrowserWindow.getAllWindows().map(w=>({id:w.id,visible:w.isVisible(),destroyed:w.isDestroyed(),loading:w.webContents.isLoading(),url:w.webContents.getURL().split('?')[0]}))};})()`;
  const result=new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('electron_inspection_timeout')),5000);
    ws.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.id===1){clearTimeout(timer);done(value);}});});
  ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
  const response=await result;assert.equal(response.result.exceptionDetails,undefined);
  const facts=response.result.result.value;assert.equal(facts.pid,state.hostPid);assert.equal(facts.electron,'44.0.0');
  const report={at:new Date().toISOString(),home:state.home,readOnly:true,facts,
    actualWorkspaceVisible:facts.windows.some(w=>w.visible && w.url==='dsh-app://app/')};
  if(afterActivation)assert.equal(report.actualWorkspaceVisible,true);
  await writeFile(file,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
}finally{ws.close();}

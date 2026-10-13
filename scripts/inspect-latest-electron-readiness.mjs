// 只读检查独立 Electron 的原 Host 就绪状态；不显示窗口、不读取凭据或发送控制事件。
import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const runtime=resolve(import.meta.dirname,'../artifacts/latest-runtime-check');
const state=JSON.parse(await readFile(resolve(runtime,'latest-live-state.json')));
assert.equal(state.executionMode,'electron');const carrier=state.electronCarrier;
assert.ok(carrier.attempt === 4 || carrier.attempt === 2 && carrier.encodingUpgrade === true);process.kill(state.hostPid,0);process.kill(carrier.electronHostPid,0);
const workspaceWait=process.argv.slice(2).includes('--workspace-wait');
assert.ok(process.argv.slice(2).every(arg=>arg==='--workspace-wait'));
const file=resolve(carrier.directory,workspaceWait?'workspace-wait-inspection.json':'readiness-inspection.json');await assert.rejects(access(file),{code:'ENOENT'});
const targets=await (await fetch(`http://127.0.0.1:${carrier.mainPort}/json/list`,{signal:AbortSignal.timeout(3000)})).json();
assert.equal(targets.length,1);assert.equal(targets[0].type,'node');
const url=new URL(targets[0].webSocketDebuggerUrl);assert.equal(url.hostname,'127.0.0.1');assert.equal(Number(url.port),carrier.mainPort);
const ws=new WebSocket(url);await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
let id=0;const pending=new Map();
ws.addEventListener('message',event=>{const value=JSON.parse(event.data);const request=pending.get(value.id);if(request){pending.delete(value.id);clearTimeout(request.timer);value.error?request.fail(Error(value.error.message)):request.done(value.result);}});
const call=(method,params={})=>new Promise((done,fail)=>{const requestId=++id;const timer=setTimeout(()=>{pending.delete(requestId);fail(Error('electron_readiness_inspection_timeout'));},5000);pending.set(requestId,{done,fail,timer});ws.send(JSON.stringify({id:requestId,method,params}));});
const evaluate=async expression=>{const response=await call('Runtime.evaluate',{expression});assert.equal(response.exceptionDetails,undefined);return response.result.objectId;};
const invoke=async (objectId,functionDeclaration,returnByValue=false)=>{const response=await call('Runtime.callFunctionOn',{objectId,functionDeclaration,returnByValue});assert.equal(response.exceptionDetails,undefined);return response.result;};
try{
  const proto=await evaluate("process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('node:child_process').ChildProcess.prototype");
  const objects=(await call('Runtime.queryObjects',{prototypeObjectId:proto})).objects.objectId;
  const child=await invoke(objects,`function(){return this.find(p=>p.pid===${carrier.electronHostPid});}`);
  assert.ok(child.objectId);
  const listener=await invoke(child.objectId,"function(){return this.listeners('message')[0];}");assert.ok(listener.objectId);
  const listenerProperties=await call('Runtime.getProperties',{objectId:listener.objectId,ownProperties:true});
  const scopes=listenerProperties.internalProperties.find(p=>p.name==='[[Scopes]]');assert.ok(scopes?.value.objectId);
  const scopeRows=await call('Runtime.getProperties',{objectId:scopes.value.objectId,ownProperties:true});
  const moduleScope=scopeRows.result.find(p=>p.value?.description==='Module');assert.ok(moduleScope?.value.objectId);
  const moduleProperties=await call('Runtime.getProperties',{objectId:moduleScope.value.objectId,ownProperties:true});
  const facts={at:new Date().toISOString(),readOnly:true,mainPid:state.hostPid,hostPid:carrier.electronHostPid};
  for(const [className,label] of [['DesktopHostProcess','host'],['DesktopBackendController','backend']]){
    const constructor=moduleProperties.result.find(p=>p.name===className);assert.ok(constructor?.value.objectId);
    const prototype=await invoke(constructor.value.objectId,'function(){return this.prototype;}');
    const instances=(await call('Runtime.queryObjects',{prototypeObjectId:prototype.objectId})).objects.objectId;
    const instance=await invoke(instances,'function(){if(this.length!==1)throw new Error("instance_count");return this[0];}');
    const props=await call('Runtime.getProperties',{objectId:instance.objectId,ownProperties:true});
    const get=name=>props.result.find(p=>p.name===name)?.value;
    if(label==='host'){
      facts.host={stopping:get('stopping')?.value,failureReported:get('failureReported')?.value,shutdownCompleted:get('shutdownCompleted')?.value};
      const promise=get('readyPromise');const promiseProps=await call('Runtime.getProperties',{objectId:promise.objectId,ownProperties:true});
      facts.host.readyPromiseState=promiseProps.internalProperties.find(p=>p.name==='[[PromiseState]]')?.value.value;
      // Host stderr may include personal data: return only whether it has any bytes.
      facts.host.hasStderr=Boolean(get('stderr')?.value);
    }else{
      const phase=await invoke(instance.objectId,'function(){return this.state.phase;}',true);facts.backend={phase:phase.value,closed:get('closed')?.value};
      if(workspaceWait){
        const callback=get('createHost');const callbackProps=await call('Runtime.getProperties',{objectId:callback.objectId,ownProperties:true});
        const callbackScopes=callbackProps.internalProperties.find(p=>p.name==='[[Scopes]]');
        const scopeProps=await call('Runtime.getProperties',{objectId:callbackScopes.value.objectId,ownProperties:true});
        const mainScope=scopeProps.result.find(p=>p.value?.description==='Closure (main)');assert.ok(mainScope?.value.objectId);
        const locals=(await call('Runtime.getProperties',{objectId:mainScope.value.objectId,ownProperties:true})).result;
        const local=name=>locals.find(p=>p.name===name)?.value;
        facts.workspace={enteredWorkspace:local('enteredWorkspace')?.value,openingWelcome:local('openingWelcome')?.subtype==='promise',hasWelcomeBackend:local('welcomeBackend')?.type==='object'};
        for(const name of ['startup','openingWelcome']){
          const value=local(name);if(value?.subtype==='promise'){
            const p=await call('Runtime.getProperties',{objectId:value.objectId,ownProperties:true});
            facts.workspace[`${name}State`]=p.internalProperties.find(row=>row.name==='[[PromiseState]]')?.value.value;
          }
        }
        const navigation=local('navigation');if(navigation?.objectId){
          const promise=await invoke(navigation.objectId,'function(){return this.promise;}');
          const p=await call('Runtime.getProperties',{objectId:promise.objectId,ownProperties:true});
          facts.workspace.navigationState=p.internalProperties.find(row=>row.name==='[[PromiseState]]')?.value.value;
        }
      }
    }
  }
  await writeFile(file,JSON.stringify(facts,null,2),{flag:'wx'});console.log(JSON.stringify(facts));
}finally{ws.close();}

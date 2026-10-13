// 独立子进程重现编码 API 边界；不运行沙箱命令、不读 Key、不分配/附着控制台。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
if(process.argv[2]==='--child'){
  const require=createRequire(resolve(sourceRoot,'packages/sandbox/sandbox-windows-acl/package.json'));
  const koffi=require('koffi'), kernel=koffi.load('kernel32.dll');
  const getCP=kernel.func('uint32 __stdcall GetConsoleOutputCP()');
  const setCP=kernel.func('int __stdcall SetConsoleOutputCP(uint32 codePage)');
  const getError=kernel.func('uint32 __stdcall GetLastError()');
  const before=getCP(), errorBefore=before===0?getError():0;
  const accepted=setCP(65001), error=accepted===0?getError():0;
  if(before!==0)assert.equal(setCP(before),1,'restore_original_console_codepage');
  console.log(JSON.stringify({electron:process.versions.electron??null,node:process.versions.node,before,errorBefore,accepted,error}));
}else{
  const detachedControl=process.argv[2]==='--detached-control';
  assert.ok(process.argv.length===2 || process.argv.length===3 && detachedControl);
  const runtime=resolve(import.meta.dirname,'../artifacts/latest-runtime-check');
  const directory=resolve(runtime,'electron-attempt-1');const file=resolve(directory,detachedControl?'console-codepage-detached-control.json':'console-codepage-control.json');
  await assert.rejects(access(file),{code:'ENOENT'});
  const prepared=JSON.parse(await readFile(resolve(directory,'preparation.json')));
  const launch=(executable,detached=false)=>new Promise((done,fail)=>{
    const child=spawn(executable,[import.meta.filename,'--child'],{cwd:sourceRoot,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},detached,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
    child.once('error',fail);child.once('close',code=>{try{assert.equal(code,0,stderr);done({pid:child.pid,...JSON.parse(stdout.trim())});}catch(error){fail(error);}});
  });
  const prior=detachedControl?JSON.parse(await readFile(resolve(directory,'console-codepage-control.json'))):undefined;
  const report={at:new Date().toISOString(),sameBindingAndArguments:true,
    electron:prior?.electron??await launch(prepared.executable),node:prior?.node??await launch(process.execPath)};
  assert.equal(report.electron.electron,'44.0.0');assert.equal(report.electron.before,0);assert.equal(report.electron.accepted,0);assert.equal(report.electron.error,6);
  if(detachedControl){
    report.detachedNode=await launch(process.execPath,true);assert.equal(report.detachedNode.node,report.node.node);
    assert.equal(report.detachedNode.before,0);assert.equal(report.detachedNode.accepted,0);assert.equal(report.detachedNode.error,6);
    assert.equal(report.node.accepted,1);
  }
  await writeFile(file,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
}

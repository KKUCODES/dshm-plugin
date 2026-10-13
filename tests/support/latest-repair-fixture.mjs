import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

/** 本项目真实归档：升级后的组件不兼容，原安装器必须恢复已有旧版。 */
export async function createLatestRepairFixture(home, profile, origin) {
  const url = new URL(origin);
  assert.equal(url.protocol, 'http:'); assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.origin, origin); assert.ok(Number(url.port) > 0);
  const name = '@dsh-mobile/latest-inflight-repair-test';
  const component = '@dsh-mobile/latest-inflight-incompatible';
  const tarballs = [];
  for (const version of ['0.0.1', '0.0.2']) {
    const pkg = resolve(home, 'fixtures', version, 'package');
    await mkdir(pkg, { recursive: true });
    await writeFile(resolve(pkg, 'package.json'), JSON.stringify({ name, version, type: 'module', exports: './index.mjs',
      peerDependencies: { '@deepseek-ai/dsh': '0.2.1-alpha.1' }, dsh: { bundle: { patch: './cordis.patch.json' } },
      ...(version === '0.0.1' ? { scripts: { postinstall: 'node build.mjs' } }
        : { bundledDependencies: [component], dependencies: { [component]: '0.0.1' } }),
    }));
    await writeFile(resolve(pkg, 'index.mjs'), 'export function apply() {}\n');
    await writeFile(resolve(pkg, 'cordis.patch.json'), JSON.stringify([{ insert: [{ id: 'latest-inflight-repair',
      name: version === '0.0.1' ? name : component }] }]));
    if (version === '0.0.1') {
      // 副作用只写脚本自身安装目录的测试标记，证明修复子进程是否仍在写入。
      await writeFile(resolve(pkg, 'writer.mjs'), `import {writeFileSync} from 'node:fs';
const file=new URL('owned-build-writes.json',import.meta.url); let writes=0;
writeFileSync(file,JSON.stringify({pid:process.pid,writes:++writes}));
const timer=setInterval(()=>writeFileSync(file,JSON.stringify({pid:process.pid,writes:++writes})),100);
setTimeout(()=>{clearInterval(timer);process.exit(0);},120000);
`);
      await writeFile(resolve(pkg, 'build.mjs'), `import {spawn} from 'node:child_process'; import {once} from 'node:events'; import {fileURLToPath} from 'node:url';
const child=spawn(process.execPath,[fileURLToPath(new URL('writer.mjs',import.meta.url))],{stdio:'inherit',windowsHide:true});
const closed=once(child,'close');
console.log('DSHM_REPAIR_SCRIPT_STARTED:'+process.pid+':'+child.pid);
try { const url=new URL('/build',${JSON.stringify(origin)}); url.searchParams.set('pid',String(process.pid)); url.searchParams.set('child',String(child.pid));
 const response=await fetch(url,{signal:AbortSignal.timeout(90000)}); if(response.status!==200)throw Error('owned_build_gate_failed');
} finally { child.kill(); await closed; }
console.log('DSHM_REPAIR_SCRIPT_FINISHED');
`);
    } else {
      const nested = resolve(pkg, 'node_modules', component);
      await mkdir(nested, { recursive: true });
      await writeFile(resolve(nested, 'package.json'), JSON.stringify({ name: component, version: '0.0.1', type: 'module',
        exports: './index.mjs', peerDependencies: { '@deepseek-ai/dsh': '>=999.0.0' } }));
      await writeFile(resolve(nested, 'index.mjs'), 'export function apply(){throw Error("incompatible_must_not_load");}\n');
    }
    const tarball = resolve(home, `repair-${version}.tgz`);
    execFileSync('C:/Windows/system32/tar.exe', ['-czf', tarball, '-C', resolve(pkg, '..'), 'package'],
      { cwd: home, windowsHide: true });
    tarballs.push(tarball.replaceAll('\\', '/'));
  }
  const metadata = JSON.parse(await readFile(resolve(home, 'fixtures/0.0.1/package/package.json'), 'utf8'));
  assert.equal(metadata.name, name); assert.equal(metadata.version, '0.0.1');
  return { name, component, tarballs, selector: `${name}@file:${relative(profile, tarballs[0]).replaceAll('\\', '/')}` };
}

import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const out = fileURLToPath(new URL('../../artifacts/compatibility/source-start/', import.meta.url));
await mkdir(out, { recursive: true });
const home = await mkdtemp(resolve(out, 'startup-'));
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const report = { at: new Date().toISOString(), root, home, port, ready: false, errors: [] };
try {
  const stdout = execFileSync(process.execPath, ['--import', 'tsx/esm', '--import', new URL('./preload-probe.mjs', import.meta.url).href,
    'apps/cli/src/bin.ts', 'web', '--host', '127.0.0.1', '--port', String(port), '--no-open'], {
    cwd: root, env: { ...process.env, DSH_HOME: home, DSHM_SOURCE_ROOT: root, DSHM_STARTUP_PROBE: '1' },
    timeout: 45000, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true, stdio: 'pipe',
  });
  report.ready = stdout.includes('DSHM_SOURCE_STARTUP_READY');
  if (!report.ready) throw Error('The real source CLI exited without a web-ready signal');
} catch (error) {
  report.errors.push({ message: 'Source CLI startup failed', code: error.code, status: error.status, signal: error.signal });
  // Do not print startup URLs, credentials or the environment from the child process.
  report.diagnostic = String(error.stderr ?? error.message).replace(/https?:\/\/\S+/g, '[URL]').slice(-5000);
}
await writeFile(resolve(out, 'startup-verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;

import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable, Writable } from 'node:stream';
import { parse } from 'yaml';

// 预检真实官方ACP进程和模型；不修改Web profile、不读取或转发凭据内容。
const root = resolve(import.meta.dirname, '../artifacts/official-dsh-alpha2');
const run = randomUUID(), marker = 'DSHM_ACP_PREFLIGHT_' + run.replaceAll('-', '');
const output = resolve(import.meta.dirname, '../artifacts/official-plugin-only', `acp-preflight-${run}.json`);
const profile = resolve(root, 'home/profiles/web/cordis.patch.yml');
const digest = async () => createHash('sha256').update(await readFile(profile)).digest('hex');
const before = await digest();
const rows = parse(await readFile(profile, 'utf8'));
const credentialPath = rows.find(row => row.id === 'credentials')?.config?.path;
assert.equal(credentialPath, resolve(root, '../official-dsh-plugin-only/home/.credentials.yaml').replaceAll('\\', '/'));
const metadata = async () => {
  const value = await stat(credentialPath);
  return { size: value.size, mtimeMs: value.mtimeMs };
};
const credentials = await metadata();
const store = resolve(root, 'node_modules/.pnpm');
const sdkFolders = (await readdir(store)).filter(name => name.startsWith('@agentclientprotocol+sdk@'));
assert.equal(sdkFolders.length, 1);
const sdkRoot = resolve(store, sdkFolders[0], 'node_modules/@agentclientprotocol/sdk');
const manifest = JSON.parse(await readFile(resolve(sdkRoot, 'package.json'), 'utf8'));
assert.equal(manifest.version, '1.4.0');
const { client, methods, ndJsonStream, PROTOCOL_VERSION } = await import(pathToFileURL(resolve(sdkRoot,
  manifest.exports['.'].import)).href);
const env = { ...process.env, DSH_HOME: resolve(root, 'home') };
for (const name of Object.keys(env)) if (/^NODE_OPTIONS$|^DSHM_OFFICIAL_|^DSH_TELEMETRY_|^DEEPSEEK_API_KEY$/.test(name)) delete env[name];
const child = spawn(process.execPath, [resolve(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), '--profile', 'acp'],
  { cwd: root, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
assert.ok(child.pid);
let stderr = '', chunks = [], timer;
child.stderr.on('data', bytes => { stderr += bytes; });
const exit = new Promise((done, reject) => { child.once('error', reject); child.once('exit', (code, signal) => done({ code, signal })); });
const report = { run, scope: 'normal-official-acp-control-and-real-model-preflight', officialVersion: '0.2.1-alpha.2',
  launchPid: child.pid, passed: false, credentialContentsRead: false, credentialForwarded: false,
  webProfileModified: false, dshModified: false, dshBuilt: false, sdkBuilt: false, androidVerified: false };
const app = client({ name: 'dshm-official-acp-preflight' })
  .onNotification(methods.client.session.update, ({ params }) => {
    if (params.update.sessionUpdate === 'agent_message_chunk' && params.update.content.type === 'text')
      chunks.push(params.update.content.text);
    return Promise.resolve();
  })
  .onRequest(methods.client.session.requestPermission, () => Promise.resolve({ outcome: { outcome: 'cancelled' } }));
const connection = app.connect(ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout)));
try {
  await Promise.race([(async () => {
    report.initialized = await connection.agent.request(methods.agent.initialize,
      { protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} });
    const session = await connection.agent.request(methods.agent.session.new, { cwd: root, mcpServers: [] });
    report.sessionId = session.sessionId;
    const result = await connection.agent.request(methods.agent.session.prompt, { sessionId: session.sessionId,
      prompt: [{ type: 'text', text: `这是DSHM官方ACP预检。不要调用任何工具、读写文件或联网。只回复 ${marker}。` }] });
    report.stopReason = result.stopReason; report.reply = chunks.join('');
    assert.equal(result.stopReason, 'end_turn'); assert.equal(report.reply.trim(), marker);
    if (methods.agent.session.close) await connection.agent.request(methods.agent.session.close, { sessionId: session.sessionId });
    report.passed = true;
  })(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('official_acp_preflight_timeout')), 150000); })]);
} catch (error) { report.failure = error.message; process.exitCode = 1; }
finally {
  clearTimeout(timer); child.stdin.end();
  const stopped = await Promise.race([exit, new Promise(done => setTimeout(() => done(null), 10000))]);
  if (stopped === null) { child.kill(); report.processExit = await exit; }
  else report.processExit = stopped;
  assert.equal(await digest(), before); assert.deepEqual(await metadata(), credentials);
  report.webProfileUnchanged = true; report.credentialMetadataUnchanged = true; report.processStopped = true;
  await writeFile(output.replace(/\.json$/, '.private.log'), stderr, { flag: 'wx' });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ run, passed: report.passed, sessionId: report.sessionId,
    stopReason: report.stopReason, failure: report.failure, processStopped: true, androidVerified: false }));
}

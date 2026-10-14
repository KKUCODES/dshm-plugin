import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import WebSocket from 'ws';

async function until(read, predicate, label, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await read();
    if (predicate(value)) return value;
    await wait(100);
  }
  throw new Error(`Timed out: ${label}`);
}

/** 用真实中转鉴权、官方会话和模型验证共同安装包；不注入或替换 DSH 模块。 */
export async function verifyRemoteBaseline({ root, home, output, hostOrigin, cookie, version, inference }) {
  const backend = resolve(root, '../backend');
  const require = createRequire(join(backend, 'package.json'));
  const { PGlite } = require('@electric-sql/pglite');
  const { exportJWK, generateKeyPair, SignJWT } = await import(pathToFileURL(require.resolve('jose')).href);
  const { buildGateway } = await import(pathToFileURL(join(backend, 'packages/gateway/dist/app.js')).href);
  const { Store } = await import(pathToFileURL(join(backend, 'packages/gateway/dist/store.js')).href);
  const db = new PGlite();
  const store = new Store({ query: (sql, args) => db.query(sql, args),
    transaction: work => db.transaction(tx => work({ query: (sql, args) => tx.query(sql, args) })),
    close: () => db.close() });
  await store.migrate();
  const listener = createServer();
  await new Promise(done => listener.listen(0, '127.0.0.1', done));
  const port = listener.address().port;
  await new Promise(done => listener.close(done));
  const origin = `http://127.0.0.1:${port}`;
  const gateway = await buildGateway({ store, publicOrigin: origin, registrationMode: 'open' });
  const observedOperations = new Set();
  gateway.websocketServer.on('connection', socket => socket.on('message', raw => {
    try {
      const method = JSON.parse(raw.toString()).operation?.method;
      if (typeof method === 'string') observedOperations.add(method);
    } catch { /* 非请求帧不参与通知连接核验，也不记录身份或正文。 */ }
  }));
  await gateway.listen({ host: '127.0.0.1', port });
  const report = { version, inference, stages: [], passed: false, androidVerified: false };
  const save = () => writeFile(join(output, 'remote.json'), JSON.stringify(report, null, 2) + '\n');
  const mark = async stage => { report.stages.push(stage); await save(); console.log(JSON.stringify({ stage, version })); };
  const manage = async action => {
    const response = await fetch(hostOrigin + '/api/dsh-mobile', { method: action ? 'POST' : 'GET',
      headers: { cookie, 'content-type': 'application/json' }, body: action ? JSON.stringify(action) : undefined,
      signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.ok(!value.error, `Plugin management failed: ${value.error}`);
    return value;
  };
  const desktop = async (method, args) => {
    const response = await fetch(hostOrigin + '/api/' + method, { method: 'POST', headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method, payload: { args } }), signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const frame = await response.json();
    assert.equal(frame.result?.ok, true, `Official call failed: ${method} ${JSON.stringify(frame.result?.error)}`);
    return frame.result.value;
  };
  const pair = await generateKeyPair('ES256', { extractable: true });
  const jwk = await exportJWK(pair.publicKey);
  const api = async (path, token, body) => {
    const dpop = await new SignJWT({ htu: origin + path, htm: 'POST',
      ...(token ? { ath: createHash('sha256').update(token).digest('base64url') } : {}) })
      .setProtectedHeader({ typ: 'dpop+jwt', alg: 'ES256', jwk }).setIssuedAt().setJti(randomUUID()).sign(pair.privateKey);
    return fetch(origin + path, { method: 'POST', headers: { dpop, ...(token ? { authorization: 'DPoP ' + token } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  };
  let deviceId, socket, workspaceId, sessionId;
  const frames = [];
  const receive = predicate => until(() => frames.find(predicate), Boolean, 'Remote frame', 180000)
    .then(frame => { frames.splice(frames.indexOf(frame), 1); return frame; });
  const send = operation => {
    const id = randomUUID(); socket.send(JSON.stringify({ type: 'request', id, operation })); return id;
  };
  const result = async operation => {
    const id = send(operation); return receive(frame => frame.id === id && ['result', 'error'].includes(frame.type));
  };
  const rpc = async (endpoint, args) => {
    const frame = await result({ method: 'remote.rpc', endpoint, payload: { args } });
    assert.equal(frame.type, 'result', `${endpoint}: ${frame.code}`);
    assert.equal(frame.value?.ok, true, `${endpoint}: ${JSON.stringify(frame.value?.error)}`);
    return frame.value.value;
  };
  const readSession = async () => {
    const snapshot = await desktop('session/projections', { request: { sessionId } });
    const history = await desktop('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: snapshot.asOfSeq, maxMessages: 100 } });
    return { snapshot, records: history.records };
  };
  const verifyReply = async marker => until(readSession, current => current.records.some(row => row.event.type === 'assistant/message'
    && (row.event.data.message.content ?? []).some(part => part.type === 'text' && part.text.trim() === marker))
    && current.records.at(-1)?.event.type === 'turn/end', `Real model reply: ${marker}`, 180000);
  try {
    await manage({ action: 'setup', origin, name: 'DSHM 双版本隔离验收' });
    await manage({ action: 'enable' });
    await until(manage, value => value.connection === 'online', 'Host relay online');
    const link = await manage({ action: 'pair' });
    const key = new URLSearchParams(new URL(link.link).hash.slice(1)).get('key');
    const claimed = await api('/v1/pairings/claim', undefined, { key, name: 'DSHM 双版本协议验收' });
    assert.equal(claimed.status, 201);
    const claim = await claimed.json(); deviceId = claim.deviceId;
    assert.equal((await api('/v1/device/ticket', claim.token)).status, 403);
    assert.equal((await api('/v1/pairings/claim', undefined, { key, name: '重复领取' })).status, 409);
    await manage({ action: 'approve', deviceId });
    const open = async () => {
      const response = await api('/v1/device/ticket', claim.token);
      assert.equal(response.status, 200);
      const { ticket } = await response.json();
      frames.length = 0;
      socket = new WebSocket(origin.replace('http:', 'ws:') + '/v1/device/socket');
      socket.on('message', raw => frames.push(JSON.parse(raw.toString())));
      await once(socket, 'open'); socket.send(JSON.stringify({ type: 'authenticate', ticket }));
      await receive(frame => frame.type === 'ready' && frame.hostOnline);
    };
    await open();
    const negotiation = await result({ method: 'remote.negotiate', version: 2 });
    assert.equal(negotiation.type, 'result'); assert.equal(negotiation.value.dshVersion, version);
    assert.equal(negotiation.value.management, false);
    assert.equal(negotiation.value.endpoints.calls.includes('schedule/list'), version === '0.2.1-alpha.2');
    assert.equal((await result({ method: 'remote.rpc', endpoint: 'workspace/create', payload: { args: { request: { path: home } } } })).code, 'remote_operation_denied');
    await mark('real-pairing-approval-version-and-permission-boundaries');
    const workspacePath = join(home, 'compatibility-workspace');
    await mkdir(workspacePath);
    workspaceId = (await desktop('workspace/create', { request: { path: workspacePath } })).workspace.workspaceId;
    sessionId = (await rpc('session/create', { request: { workspaceId } })).sessionId;
    report.sessionId = sessionId;
    const title = 'DSHM 双版本 ' + version;
    assert.equal((await rpc('session/rename', { request: { sessionId, title } })).title, title);
    assert.ok((await rpc('session/list', { _request: {} })).items.some(item => item.sessionId === sessionId));
    assert.ok(JSON.stringify(await desktop('session/projections', { request: { sessionId } })).includes(title));
    const catalog = await rpc('session/modelCatalog', {});
    const provider = catalog.groups.find(group => group.id === 'deepseek-official');
    assert.ok(provider?.models.length >= 2);
    for (const model of provider.models.slice(0, 2)) {
      await rpc('session/selectModel', { request: { sessionId, provider: provider.id, model: model.id } });
      assert.equal((await desktop('session/projections', { request: { sessionId } })).values.modelSelection.next.model, model.id);
    }
    const follow = send({ method: 'remote.stream', endpoint: 'session/follow', payload: { args: { request: { address: { kind: 'session', sessionId }, assistantStream: true } } } });
    await receive(frame => frame.id === follow && frame.type === 'event' && frame.value?.type === 'snapshot');
    await mark('workspace-session-created-list-and-two-models-synchronized');
    const marker = 'DSHM_REMOTE_BASELINE_' + randomUUID();
    await rpc('session/prompt', { request: { sessionId, requestId: randomUUID(), mode: 'queue',
      content: [{ type: 'text', text: inference ? `只回复 ${marker}，不要调用工具。` : marker }] } });
    const history = inference ? await verifyReply(marker) : await until(readSession,
      current => JSON.stringify(current).includes('MISSING_CREDENTIAL'), 'Official missing-credential result');
    assert.ok(JSON.stringify(history).includes(marker));
    const remoteHistory = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: history.snapshot.asOfSeq, maxMessages: 100 } });
    assert.deepEqual(remoteHistory.records, history.records);
    assert.ok(frames.some(frame => frame.id === follow && frame.type === 'event' && JSON.stringify(frame.value).includes(marker)));
    await mark(inference ? 'remote-real-model-reply-live-stream-and-identical-history' : 'remote-send-history-and-official-missing-credential-error');
    socket.send(JSON.stringify({ type: 'cancel', id: follow }));
    if (inference) {
      await rpc('commands/execute', { agentId: sessionId, line: '/permission read-only', submittedAttachments: [] });
      const events = send({ method: 'remote.stream', endpoint: '$events', payload: { args: {} } });
      const opening = await receive(frame => frame.id === events && frame.value?.type === 'ready');
      for (const decision of ['allowed-once', 'rejected']) {
        const file = `approval-${decision}.txt`, path = join(workspacePath, file);
        await writeFile(path, 'BEFORE', { flag: 'wx' });
        const after = 'AFTER_' + randomUUID(), reply = 'DSHM_APPROVAL_' + randomUUID();
        await rpc('session/prompt', { request: { sessionId, requestId: randomUUID(), mode: 'queue', content: [{ type: 'text',
          text: `先使用 read 工具读取当前工作区 ${file}，再使用 write 工具把内容替换为 ${after}，write 的 sandbox_permissions 使用 workspace-write。当前只读，请申请本次写入批准并等待；不要执行命令或改其他文件。审批被拒绝则停止，不重试或绕过。完成或拒绝后都只回复 ${reply}。` }] } });
        const event = await receive(frame => frame.id === events && frame.value?.type === 'waterfall'
          && frame.value.event === 'approval/request' && frame.value.agentId === sessionId);
        assert.equal(event.value.request.toolName, 'write');
        assert.equal(await readFile(path, 'utf8'), 'BEFORE');
        await rpc('$events/result', { clientId: opening.value.clientId, eventId: event.value.eventId,
          outcome: { kind: 'result', value: decision } });
        await verifyReply(reply);
        assert.equal((await readFile(path, 'utf8')).trim(), decision === 'allowed-once' ? after : 'BEFORE');
        await mark('real-write-approval-' + decision);
      }
      socket.send(JSON.stringify({ type: 'cancel', id: events }));
    }
    const beforeReconnect = (await readSession()).records;
    socket.close(); await once(socket, 'close');
    await open();
    assert.deepEqual((await rpc('session/page', { request: { address: { kind: 'session', sessionId },
      throughSeq: beforeReconnect.at(-1).event.seq, maxMessages: 100 } })).records, beforeReconnect);
    await mark('fresh-ticket-reconnect-preserves-complete-history');
    if (process.env.DSHM_ANDROID_PROBE === '1') {
      assert.equal(inference, true, 'Android integration requires the dedicated real model');
      const { verifyMarketBaselineAndroid } = await import(pathToFileURL(resolve(root, '../dsh-mobile/tests/support/market-baseline-android.mjs')).href);
      const mobileLink = await manage({ action: 'pair' });
      let mobileDevice;
      try {
        report.android = await verifyMarketBaselineAndroid({ origin, pairLink: mobileLink.link, title, marker, version, output,
          approve: async fingerprint => {
            mobileDevice = (await manage()).devices.find(device => device.fingerprint === fingerprint);
            assert.equal(mobileDevice?.status, 'pending');
            await manage({ action: 'approve', deviceId: mobileDevice.id });
          },
          revoke: async fingerprint => {
            if (!mobileDevice) mobileDevice = (await manage()).devices.find(device => device.fingerprint === fingerprint);
            if (mobileDevice && mobileDevice.status !== 'revoked') {
              await manage({ action: 'revoke', deviceId: mobileDevice.id });
              mobileDevice.status = 'revoked';
            }
          }, verifyReply,
        });
        assert.equal(report.android.passed, true);
        assert.ok(observedOperations.has('remote.taskFollow'), 'Native notification connection did not pass negotiation');
        report.androidVerified = true;
        await mark('android-own-page-real-reply-and-native-notification-negotiation');
      } finally {
        if (mobileDevice && mobileDevice.status !== 'revoked') await manage({ action: 'revoke', deviceId: mobileDevice.id });
      }
    }
    await manage({ action: 'revoke', deviceId });
    report.deviceRevoked = true;
    assert.equal((await api('/v1/device/ticket', claim.token)).status, 401);
    await mark('revocation-denies-new-ticket');
    report.passed = true;
  } catch (error) {
    report.failure = error.message;
    throw error;
  } finally {
    const failures = [];
    if (deviceId && !report.deviceRevoked) try { await manage({ action: 'revoke', deviceId }); report.deviceRevoked = true; } catch (error) { failures.push(error.message); }
    socket?.terminate();
    if (sessionId) try { await desktop('session/cancel', { request: { sessionId } }); } catch (error) { failures.push(error.message); }
    if (workspaceId) try { await desktop('workspace/delete', { request: { workspaceId } }); } catch (error) { failures.push(error.message); }
    try { await manage({ action: 'disable' }); } catch (error) { failures.push(error.message); }
    await gateway.close(); await db.close();
    report.cleanupFailures = failures; report.cleanupCompleted = failures.length === 0;
    await save();
    assert.deepEqual(failures, [], 'Remote cleanup failed');
  }
  return report;
}

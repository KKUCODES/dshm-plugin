import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const path = resolve(runtime, 'node_modules/@deepseek-ai/dsh-api-gateway/lib/index.js');
const originalHash = '12489aafd3be30c606824f52b45f682c42f95448db89f2458bba87fa944a50c0';
const digest = value => createHash('sha256').update(value).digest('hex');
const observer = `
  notificationListeners = new Set();
  notificationsClosed = false;
  pendingNotifications = Object.freeze({
    observe: listener => {
      if (this.notificationsClosed) throw Error('pending_notifications_closed');
      if (this.notificationListeners.size >= 64) throw Error('pending_notifications_busy');
      const snapshot = [];
      for (const pending of this.pendingRemoteEvents.values()) {
        const item = this.notificationItem(pending);
        if (item) snapshot.push(item);
        if (snapshot.length > 256) throw Error('pending_notifications_overflow');
      }
      this.notificationListeners.add(listener);
      return Object.freeze({ snapshot: Object.freeze(snapshot), dispose: () => this.notificationListeners.delete(listener) });
    }
  });
  notificationItem(pending) {
    const event = pending.frame.event;
    if (event !== 'approval/request' && event !== 'user-questions/request') return;
    return Object.freeze({ eventId: pending.id, sessionId: pending.frame.agentId, kind: event === 'approval/request' ? 'approval' : 'question' });
  }
  publishNotification(change) {
    const value = Object.freeze(change);
    for (const listener of [...this.notificationListeners]) {
      try { void Promise.resolve(listener(value)).catch(() => {}); } catch { /* 只读观察失败不影响原 waterfall。 */ }
    }
  }
`;
const edits = [
  ['\tsrcClaims;', observer + '\tsrcClaims;'],
  ['\t\tsuper(ctx, "typertGateway");', '\t\tsuper(ctx, "typertGateway");\n    ctx.effect(() => () => { this.notificationsClosed = true; this.notificationListeners.clear(); }, "dshm: readonly pending observers");'],
  ['\t\t\telse for (const client of this.remoteEventClients.values()) this.deliverRemoteEvent(pending, client);', `
      else {
        const item = this.notificationItem(pending);
        if (item) this.publishNotification({ type: 'pending', item });
        for (const client of this.remoteEventClients.values()) this.deliverRemoteEvent(pending, client);
      }`],
  ['\t\tthis.pendingRemoteEvents.delete(pending.id);', '\t\tthis.pendingRemoteEvents.delete(pending.id);\n    if (this.notificationItem(pending)) this.publishNotification({ type: "resolved", eventId: pending.id });'],
];

/** 只作用于项目内固定 npm 候选 runtime；原编译字节身份必须匹配，不沿用旧版安装器。 */
export async function prepareLatestPendingObserver() {
  const pkg = JSON.parse(await readFile(resolve(runtime, 'node_modules/@deepseek-ai/dsh-api-gateway/package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-api-gateway' || pkg.version !== '0.2.1-alpha.1') throw Error('latest_gateway_version_mismatch');
  const originals = resolve(runtime, 'patch-originals');
  await mkdir(originals, { recursive: true });
  const backup = resolve(originals, 'gateway-index.js');
  const actual = await realpath(runtime);
  const inside = async path => {
    const rel = relative(actual, await realpath(path));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_gateway_outside_runtime');
  };
  await inside(path); await inside(originals);
  let bytes = await readFile(path);
  if (digest(bytes) !== originalHash) { await inside(backup); bytes = await readFile(backup); }
  if (digest(bytes) !== originalHash) throw Error('latest_gateway_original_mismatch');
  let changed = bytes.toString();
  for (const [before, after] of edits) {
    if (changed.split(before).length !== 2) throw Error('latest_gateway_patch_anchor_mismatch');
    changed = changed.replace(before, after);
  }
  const current = await readFile(path);
  if (![originalHash, digest(changed)].includes(digest(current))) throw Error('latest_gateway_changed_outside_patch');
  await writeFile(backup, bytes);
  await writeFile(path, changed);
  const report = { version: pkg.version, sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc',
    package: pkg.name, patch: 'latest-pending-observer-v1', before: originalHash, after: digest(changed),
    target: path, isolatedCandidateOnly: true };
  await writeFile(resolve(runtime, 'pending-observer-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await prepareLatestPendingObserver()));

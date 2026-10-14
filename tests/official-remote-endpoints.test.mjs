import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'artifacts/official-endpoint-policy-tests');
await mkdir(output, { recursive: true });
const directory = await mkdtemp(resolve(output, 'run-'));
const entry = resolve(directory, 'remote-adapter.mjs');
await build({ entryPoints: [resolve(root, 'src/remote-adapter.ts')], outfile: entry,
  bundle: true, platform: 'node', target: 'node22', format: 'esm',
  external: ['@deepseek-ai/*', 'ws', 'zod'], define: { DSHM_LATEST_CANDIDATE: 'true' } });
const { RemoteAdapter } = await import(pathToFileURL(entry).href);

for (const version of ['0.2.0-rc.2', '0.2.1-alpha.1', '0.2.1-alpha.2', '0.1.6-alpha.2']) {
  test(`${version} 的协商和实际请求处理保留各自官方预设边界`, async () => {
    const calls = [];
    const hostId = randomUUID();
    // 只验证自有适配器的转发边界；真实官方/Android链路另行验证。
    const adapter = new RemoteAdapter({ version,
      connection: { createSharedFetchHandler: () => ({ fetch: async request => {
        const body = await request.json();
        calls.push({ endpoint: body.method, payload: body.payload });
        return Response.json({ type: 'server-response', rpcId: body.rpcId,
          result: { ok: true, value: { accepted: true } } });
      } }) }, modules: { graph: () => ({ rev: 'test' }) },
      gateway: { wireStream: { failure: error => { throw error; } } },
    }, hostId);
    const context = { hostId, deviceId: randomUUID(), connectionId: randomUUID(), management: true };
    const request = async operation => {
      const frames = [];
      await adapter.receive({ type: 'request', id: randomUUID(), operation, context }, frame => frames.push(frame));
      assert.equal(frames.length, 1); return frames[0];
    };
    try {
      const negotiation = await request({ method: 'remote.negotiate', version: 2 });
      assert.equal(negotiation.type, 'result');
      assert.equal(negotiation.value.dshVersion, version);
      assert.ok(negotiation.value.endpoints.calls.includes('agentPresets/read'));
      for (const [endpoint, args] of [
        ['agentPresets/copy', { from: 'standard', id: 'test-copy' }],
        ['agentPresets/deletePreset', { id: 'test-copy' }],
      ]) {
        const legacy = version === '0.1.6-alpha.2';
        assert.equal(negotiation.value.endpoints.calls.includes(endpoint), legacy);
        const response = await request({ method: 'remote.rpc', endpoint, payload: { args } });
        assert.equal(response.type, legacy ? 'result' : 'error');
        if (!legacy) assert.equal(response.code, 'remote_operation_denied');
      }
      assert.equal(calls.length, version === '0.1.6-alpha.2' ? 2 : 0);
      const read = await request({ method: 'remote.rpc', endpoint: 'agentPresets/read',
        payload: { args: { agentPreset: 'standard' } } });
      assert.equal(read.type, 'result');
      assert.equal(calls.at(-1).endpoint, 'agentPresets/read');
    } finally { adapter.dispose(); }
  });
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { runIdentity } from './probe.mjs';

const root = resolve(process.env.DSHM_SOURCE_ROOT ?? 'F:/Program Files/deepseek-harness');
for (const mode of ['original-source', 'explicit-tsconfig', 'link', 'canonical-preload', 'compiled']) {
  test(`real profile resolver and installed tools: ${mode}`, async () => {
    const result = await runIdentity(root, mode);
    assert.equal(result.pinned, 'DSHM_IDENTITY_PINNED', 'A plugin-owned dependency must keep its selected version');
    assert.deepEqual(result.mobilePlugin, { name: 'dsh-mobile', apply: 'function' });
    if (['original-source', 'explicit-tsconfig'].includes(mode)) {
      assert.equal(result.symptom, "Cannot read properties of undefined (reading 'prepare')");
      assert.equal(result.sameSymbol, false);
      assert.equal(result.externalSameSymbol, false);
    } else if (mode === 'link') {
      assert.equal(result.sameSymbol, true);
      assert.equal(result.externalSameSymbol, false, 'Link mode alone does not repair installed plugins');
      assert.equal(result.cjsSameSymbol, false);
    } else {
      for (const field of ['sameSymbol', 'sameClass', 'sameSubpath', 'externalSameSymbol', 'cjsSameSymbol']) assert.equal(result[field], true, field);
      assert.equal(result.symptom, undefined);
      assert.equal(result.cjsError, undefined);
      assert.equal(result.toolValue, 'DSHM_IDENTITY_OK', 'Run the real staged tool scheduler, not just export inspection');
      assert.deepEqual(result.worker, { sameSymbol: true, sameClass: true }, 'Workers keep the inherited profile resolver and canonical identity');
    }
  });
}

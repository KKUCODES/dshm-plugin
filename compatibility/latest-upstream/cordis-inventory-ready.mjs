import { createHash } from 'node:crypto';

/** 只扩展固定新版的组合载荷；旧版本变换及其哈希保持不变。 */
export function transformInventoryReady(source) {
  const before = '076a5cd076c575323dd78f2f517db170f4735d78b6b1549f7e4f5debb1f09760';
  if (createHash('sha256').update(source).digest('hex') !== before) throw Error('latest_inventory_ready_source_mismatch');
  const anchor = "  ctx.effect(() => {\n    const off = connection.generation.subscribe";
  if (source.split(anchor).length !== 2) throw Error('latest_inventory_ready_boundary_mismatch');
  return source.replace(anchor, `  // 操作收尾也可能在断线后刷新；等待真实连接就绪，不重放写入操作。
  const refreshInventory = inventory.refresh
  inventory.refresh = () => {
    if (!connection.generation.getSnapshot()) return
    refreshInventory()
  }
${anchor}`);
}

import { createHash } from 'node:crypto';

export const panelErrorSourceHash = 'e0b4abe5939d4efa18ce9f768e977342c4501776692051f5af4978a61f8ed0d3';
export const panelErrorExpression = 'errors.get(pluginId)?.packageId === selectedPackageId ? errors.get(pluginId) : undefined';

/** 旧客户端尝试的错误不能遮住当前选中版本的原 Host 诊断。 */
export function transformPanelError(source) {
  if (createHash('sha256').update(source).digest('hex') !== panelErrorSourceHash) throw Error('latest_panel_error_source_mismatch');
  const anchor = '    const failure = errors.get(pluginId)';
  if (source.split(anchor).length !== 2) throw Error('latest_panel_error_boundary_mismatch');
  return source.replace(anchor, `    const failure = ${panelErrorExpression}`);
}

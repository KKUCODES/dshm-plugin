import { createHash } from 'node:crypto';

export const hashes = {
  'src/index.ts': '35bc721166944ef3d5959566847bb3ab7ca9e32a492c837f9339339492cf83f2',
  'lib/index.js': '8f3d8aa820474055e274b940c26c4d1cdca34a057d94fb5a75b23d6481d20861',
  'lib/types/index.js': 'e0f12924e6f2424544b51ad5191471bd8c97d11f78013d405bc2ceff81657229',
  'lib/types/index.d.ts': '23bfa5c4537694ae1b50886c80dbe7606810a5d1fd5a67e187b1317aa6959885',
};

/** 叠加在已核验的cordis-inspect-v1上，保留原接口及连接寿命校验。 */
export function transform(source) {
  if (createHash('sha256').update(source).digest('hex') !== hashes['src/index.ts']) throw Error('Unsupported approval runner baseline');
  const anchor = '    this.registry.claimRequest(requestId)\n    const settled = await this.settleActivation(plugin, resolution, requestId)';
  if (source.split(anchor).length !== 2) throw Error('Approval settlement boundary changed');
  const repeatedApproval = "latest.status !== expectedStatus && (!pending.requiresApproval && latest.status !== 'client-pending')";
  if (source.split(repeatedApproval).length !== 2) throw Error('Approval start boundary changed');
  source = source.replace(repeatedApproval, "latest.status !== expectedStatus && (pending.requiresApproval || latest.status !== 'client-pending')");
  return source.replace(anchor, `    // 首个批准已开始执行时，另一页面的旧拒绝或启动被拒回执不能抢走结算权。
    // 真实Host启动失败由runHostHalf先标记failed，仍允许原失败回执完成请求。
    const attempt = plugin?.latestRun
    if (attempt?.pluginRunId !== pending.pluginRunId) return { accepted: false }
    if (!resolution.ok && resolution.reason === 'rejected' && attempt.status !== 'awaiting-approval') return { accepted: false }
    if (!resolution.ok && resolution.reason === 'host-half-failed' && attempt.status !== 'failed') return { accepted: false }
${anchor}`);
}

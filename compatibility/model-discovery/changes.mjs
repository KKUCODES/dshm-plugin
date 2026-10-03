/** 为手机草稿探测添加独立命名空间；默认电脑发现行为保持原样。 */
export const namespace = 'dshm.pi-ai-draft';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Unsupported model discovery source');
  return source.replace(before, after);
}

export function discoverySource(source) {
  source = replaceOnce(source,
    '  storedProfile?: () => StoredModelDiscoveryProfile | undefined,\n): Promise<readonly LlmDiscoveredModel[]> {',
    '  storedProfile?: () => StoredModelDiscoveryProfile | undefined,\n  options?: { redirect: "error" },\n): Promise<readonly LlmDiscoveredModel[]> {');
  return replaceOnce(source, "      method: 'GET',\n      headers,",
    "      method: 'GET',\n      // Remote草稿只请求已确认目标，不将认证头带到重定向地址。\n      ...(options === undefined ? {} : { redirect: options.redirect }),\n      headers,");
}

export function registrationSource(source) {
  const anchor = '  ctx.llm.registerModelDiscovery(NS, (request, signal) => discoverModels(\n    { ...request, ...signal === undefined ? {} : { signal } },\n    () => storedDiscoveryProfile(request.provider),\n  ))';
  return replaceOnce(source, anchor, anchor + `
  // 独立命名空间使旧版Host明确拒绝，而不是忽略安全选项后发出请求。
  ctx.llm.registerModelDiscovery('${namespace}', (request, signal) => discoverModels(
    { ...request, ...signal === undefined ? {} : { signal } },
    () => storedDiscoveryProfile(request.provider),
    { redirect: 'error' },
  ))`);
}

export function compiledSource(source) {
  source = replaceOnce(source, 'async function discoverModels(request, storedProfile) {',
    'async function discoverModels(request, storedProfile, options) {');
  source = replaceOnce(source, '\t\t\tmethod: "GET",\n\t\t\theaders,',
    '\t\t\tmethod: "GET",\n\t\t\t...(options === void 0 ? {} : { redirect: options.redirect }),\n\t\t\theaders,');
  const anchor = '\tctx.llm.registerModelDiscovery(NS, (request, signal) => discoverModels({\n\t\t...request,\n\t\t...signal === void 0 ? {} : { signal }\n\t}, () => storedDiscoveryProfile(request.provider)));';
  return replaceOnce(source, anchor, anchor + `
\tctx.llm.registerModelDiscovery('${namespace}', (request, signal) => discoverModels({
\t\t...request,
\t\t...signal === void 0 ? {} : { signal }
\t}, () => storedDiscoveryProfile(request.provider), { redirect: 'error' }));`);
}

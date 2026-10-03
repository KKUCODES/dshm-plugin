import Schema from '@deepseek-ai/schemastery'

/** 与原设置页相同，从电脑实际schema读取协议枚举，不维护第二份协议表。 */
export function providerProtocolChoices(schema: unknown): string[] {
  const root = new Schema(schema as Schema)
  const node = root.dict?.providers?.inner?.dict?.api
  return node?.type === 'union' ? node.list?.flatMap(item => typeof item.value === 'string' ? [item.value] : []) ?? [] : []
}

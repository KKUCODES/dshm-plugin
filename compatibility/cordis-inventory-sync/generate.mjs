import fs from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { outputRoot } from './build.mjs';
import { hashes, transform } from './changes.mjs';

// 原生成器读取内存中的候选源码，所有输出仍在插件项目内，不临时修改运行安装。
const root = resolve(process.argv[2]);
const require = createRequire(resolve(root, 'packages/typert/generator/package.json'));
const { WorkspaceTypertGenerator } = await import(pathToFileURL(resolve(root, 'packages/typert/generator/lib/index.js')).href);
const ts = require('typescript');
const candidates = new Map();
for (const path of Object.keys(hashes)) {
  const input = resolve(root, 'packages', path);
  candidates.set(input.toLowerCase(), transform(path, await readFile(input, 'utf8')));
}
const original = fs.readFileSync, originalTs = ts.sys.readFile, seen = new Set();
const lookup = path => {
  if (typeof path !== 'string') return undefined;
  const key = resolve(path).toLowerCase();
  if (candidates.has(key)) { seen.add(key); return candidates.get(key); }
};
let artifacts;
try {
  fs.readFileSync = function(path, options) {
    const value = lookup(path);
    if (value === undefined) return original.call(this, path, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? value : Buffer.from(value);
  };
  syncBuiltinESMExports();
  ts.sys.readFile = path => lookup(path) ?? originalTs(path);
  // 完整入口已由build.mjs严格检查；此处保留原生成器的协议分析与注解检查。
  artifacts = new WorkspaceTypertGenerator(root, { checkDiagnostics: false }).generate(['@deepseek-ai/dsh-cordis-host-runner'], ['host']);
} finally {
  fs.readFileSync = original; syncBuiltinESMExports(); ts.sys.readFile = originalTs;
}
if (!seen.has(resolve(root, 'packages/extensions/cordis-host-runner/src/types.ts').toLowerCase())) throw Error('Generator did not read candidate events');
const artifact = artifacts.find(item => item.package === '@deepseek-ai/dsh-cordis-host-runner' && item.face === 'host');
if (!artifact?.remote || !artifact.js.includes('cordis/inventory-changed')) throw Error('Generated event missing');
await mkdir(resolve(outputRoot, 'generated'), { recursive: true });
await writeFile(resolve(outputRoot, 'generated/full-analysis.host.js'), artifact.js);
// 聚焦包生成会收窄其他插件的全局类型扩展；只合入原生成器产生的新事件，保留现有完整反射与RPC codec。
function eventArray(source) {
  const file = ts.createSourceFile('typert.host.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declaration = file.statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [])
    .find(value => value.name.getText(file) === 'TYPERT');
  const property = (object, name) => object?.properties.find(value => ts.isPropertyAssignment(value) && value.name.getText(file).replace(/["']/g, '') === name)?.initializer;
  const array = property(property(declaration?.initializer, 'model'), 'events');
  if (!array || !ts.isArrayLiteralExpression(array)) throw Error('Generated event table not found');
  return { file, array };
}
const baseline = await readFile(resolve(root, 'packages/extensions/cordis-host-runner/lib/typert.host.js'), 'utf8');
const originalEvents = eventArray(baseline), nextEvents = eventArray(artifact.js);
const event = nextEvents.array.elements.find(value => ts.isObjectLiteralExpression(value) && value.properties.some(property =>
  ts.isPropertyAssignment(property) && property.name.getText(nextEvents.file).replace(/["']/g, '') === 'name'
    && ts.isStringLiteral(property.initializer) && property.initializer.text === 'cordis/inventory-changed'));
if (!event || baseline.includes('cordis/inventory-changed')) throw Error('Unexpected event baseline');
const insertion = originalEvents.array.end - 1;
const existing = baseline.slice(originalEvents.array.pos, insertion).trimEnd();
const content = baseline.slice(0, insertion) + (existing.endsWith(',') ? '' : ',') + '\n' + event.getText(nextEvents.file) + '\n' + baseline.slice(insertion);
await writeFile(resolve(outputRoot, 'generated/typert.host.js'), content);
console.log(JSON.stringify({ generatedEvent: 'cordis/inventory-changed', candidateSourcesRead: seen.size, rpcCodecsPreserved: true }));

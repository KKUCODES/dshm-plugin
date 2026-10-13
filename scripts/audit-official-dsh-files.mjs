import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { resolve, relative, sep } from 'node:path'

const action = process.argv[2]
assert.ok(['capture', 'verify', 'verify-pnpm'].includes(action) && process.argv.length === 3)
const root = resolve(import.meta.dirname, '../artifacts/official-dsh-plugin-only')
const modules = resolve(root, 'node_modules/@deepseek-ai')
const report = resolve(root, 'official-core-baseline.json')
const within = path => { const rel = relative(root, path); assert.ok(rel && !rel.startsWith(`..${sep}`) && rel !== '..'); return rel.split(sep).join('/') }
const files = []
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    assert.equal(await realpath(path), path, 'Official baseline must not follow redirected package files')
    if (entry.isDirectory()) { await visit(path); continue }
    assert.ok(entry.isFile(), 'Unexpected official package entry')
    const hash = createHash('sha256')
    for await (const bytes of createReadStream(path)) hash.update(bytes)
    files.push({ path: within(path), sha256: hash.digest('hex') })
  }
}
if (action === 'verify-pnpm') {
  // pnpm 正常安装会改变目录布局；按同一包内的相对路径与首次 npm 原字节比对，不能重建基线。
  const baseline = JSON.parse(await readFile(report, 'utf8'))
  const expected = new Map()
  let npmNestedDependencyFiles = 0
  for (const file of baseline.files) {
    const match = file.path.match(/^node_modules\/@deepseek-ai\/([^/]+)\/(.+)$/)
    assert.ok(match)
    if (match[2].startsWith('node_modules/')) { npmNestedDependencyFiles++; continue }
    if (!expected.has(match[1])) expected.set(match[1], new Map())
    expected.get(match[1]).set(match[2], file.sha256)
  }
  const pnpm = resolve(root, 'node_modules/.pnpm'), seen = new Set()
  let copies = 0, checked = 0
  for (const entry of await readdir(pnpm, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('@deepseek-ai+')) continue
    const scope = resolve(pnpm, entry.name, 'node_modules/@deepseek-ai')
    const packages = (await readdir(scope, { withFileTypes: true })).filter(item => item.isDirectory() && !item.isSymbolicLink())
    assert.equal(packages.length, 1, 'Each official pnpm store entry must contain one real package')
    const name = packages[0].name
    const directory = resolve(scope, name)
    const actual = new Map()
    async function check(dir) {
      assert.equal(await realpath(dir), dir)
      for (const file of await readdir(dir, { withFileTypes: true })) {
        if (dir === directory && file.name === 'node_modules') {
          continue // npm 的嵌套第三方依赖与 pnpm 的依赖链接/shim 均不属于该官方包。
        }
        const path = resolve(dir, file.name)
        if (file.isDirectory()) { await check(path); continue }
        assert.ok(file.isFile())
        const hash = createHash('sha256')
        for await (const bytes of createReadStream(path)) hash.update(bytes)
        actual.set(relative(directory, path).split(sep).join('/'), hash.digest('hex'))
      }
    }
    await check(directory)
    assert.deepEqual([...actual].sort(), [...(expected.get(name) ?? [])].sort(), `Official pnpm package bytes differ: ${name}`)
    seen.add(name); copies++; checked += actual.size
  }
  assert.deepEqual([...seen].sort(), [...expected.keys()].sort(), 'Official package coverage changed')
  const activeVersion = JSON.parse(await readFile(resolve(modules, 'dsh/package.json'), 'utf8')).version
  assert.equal(activeVersion, baseline.version)
  console.log(JSON.stringify({ action, version: baseline.version, packages: seen.size, copies, checkedFiles: checked,
    baselineFiles: baseline.files.length, npmNestedDependencyFiles, unchanged: true }))
  process.exit(0)
}
await visit(modules)
files.sort((a, b) => a.path.localeCompare(b.path, 'en'))
const version = JSON.parse(await readFile(resolve(modules, 'dsh/package.json'), 'utf8')).version
assert.equal(version, '0.2.1-alpha.1')
if (action === 'capture') await writeFile(report, JSON.stringify({ version, files }, null, 2) + '\n', { flag: 'wx' })
else {
  const baseline = JSON.parse(await readFile(report, 'utf8'))
  assert.equal(baseline.version, version)
  assert.deepEqual(files, baseline.files, 'Official DSH package files changed')
}
console.log(JSON.stringify({ action, version, files: files.length, unchanged: action === 'verify' }))

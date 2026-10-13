import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

// 两份固定官方发布包只读比较；新版首次安装的独立基线不能覆盖旧版基线。
const action = process.argv[2]
assert.ok(['capture', 'verify', 'contracts'].includes(action) && process.argv.length === 3)
const root = resolve(import.meta.dirname, '../artifacts/official-dsh-alpha2')
const oldRoot = resolve(import.meta.dirname, '../artifacts/official-dsh-plugin-only')
const baselinePath = resolve(root, 'official-core-baseline.json')
const reportPath = resolve(root, 'public-contract-comparison.json')
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

async function packages(directory) {
  const store = resolve(directory, 'node_modules/.pnpm')
  const result = new Map()
  for (const entry of await readdir(store, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('@deepseek-ai+')) continue
    const scope = resolve(store, entry.name, 'node_modules/@deepseek-ai')
    const actual = (await readdir(scope, { withFileTypes: true })).filter(item => item.isDirectory() && !item.isSymbolicLink())
    assert.equal(actual.length, 1)
    assert.ok(!result.has(actual[0].name), 'Unexpected duplicate official package')
    result.set(actual[0].name, resolve(scope, actual[0].name))
  }
  return result
}

async function files(directory, typesOnly = false) {
  const result = []
  async function visit(dir) {
    assert.equal(await realpath(dir), dir)
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (dir === directory && entry.name === 'node_modules') continue
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) { await visit(path); continue }
      assert.ok(entry.isFile(), 'Redirected official package content is not accepted')
      if (!typesOnly || entry.name.endsWith('.d.ts')) result.push({
        path: relative(directory, path).replaceAll('\\', '/'), sha256: digest(await readFile(path)),
      })
    }
  }
  await visit(directory)
  return result.sort((a, b) => a.path.localeCompare(b.path, 'en'))
}

const current = await packages(root)
const metadata = JSON.parse(await readFile(resolve(current.get('dsh'), 'package.json'), 'utf8'))
assert.equal(metadata.version, '0.2.1-alpha.2')
if (action === 'capture' || action === 'verify') {
  const contents = []
  for (const [name, directory] of [...current].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    contents.push({ name, files: await files(directory) })
  }
  const baseline = { version: metadata.version, packages: contents }
  if (action === 'capture') await writeFile(baselinePath, JSON.stringify(baseline, null, 2) + '\n', { flag: 'wx' })
  else assert.deepEqual(baseline, JSON.parse(await readFile(baselinePath, 'utf8')), 'Original alpha.2 package files changed')
  console.log(JSON.stringify({ action, version: metadata.version, packages: contents.length,
    files: contents.reduce((count, item) => count + item.files.length, 0), unchanged: action === 'verify' }))
} else {
  const old = await packages(oldRoot)
  const groups = ['dsh-api-gateway', 'dsh-api-session-controller', 'dsh-api-workspace-controller',
    'dsh-api-workspace-files', 'dsh-api-job-controller', 'dsh-client-connection', 'dsh-client-modules',
    'dsh-client-ui-slots', 'dsh-client-ui-renderer', 'dsh-user-approval', 'dsh-user-questions',
    'dsh-plan-mode', 'dsh-jobs', 'dsh-agent-tool-presentation', 'dsh-attachment', 'dsh-credentials']
  const contracts = []
  for (const name of groups) {
    assert.ok(old.has(name) && current.has(name), `Missing published package: ${name}`)
    const before = await files(old.get(name), true), after = await files(current.get(name), true)
    const oldFiles = new Map(before.map(file => [file.path, file.sha256]))
    const newFiles = new Map(after.map(file => [file.path, file.sha256]))
    contracts.push({ name, oldPath: relative(oldRoot, old.get(name)).replaceAll('\\', '/'),
      newPath: relative(root, current.get(name)).replaceAll('\\', '/'),
      before, after, changed: after.filter(file => oldFiles.has(file.path) && oldFiles.get(file.path) !== file.sha256).map(file => file.path),
      added: after.filter(file => !oldFiles.has(file.path)).map(file => file.path),
      removed: before.filter(file => !newFiles.has(file.path)).map(file => file.path) })
  }
  const report = { at: new Date().toISOString(), from: '0.2.1-alpha.1', to: metadata.version,
    scope: 'published-package-declarations-only', contracts,
    // 声明差异只供定位；即使没有变化，也不能当作运行时或真实 Android 通过。
    runtimeVerified: false, androidVerified: false, credentialsRead: false, dshModified: false }
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ action, report: reportPath, declarationsCompared: contracts.length,
    changed: contracts.filter(item => item.changed.length || item.added.length || item.removed.length)
      .map(({ name, changed, added, removed }) => ({ name, changed, added, removed })) }))
}

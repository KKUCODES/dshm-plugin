import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

// 外部验收进程只启动官方CLI并收集输出，不向DSH进程注入模块或替换运行时。
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--alpha2'))
const alpha2 = process.argv[2] === '--alpha2'
const root = resolve(import.meta.dirname, '../artifacts', alpha2 ? 'official-dsh-alpha2' : 'official-dsh-plugin-only')
const port = alpha2 ? 16958 : 16955
const run = randomUUID()
const log = resolve(root, `web-${run}.private.log`)
const receipt = resolve(root, 'official-web-receipt.json')
writeFileSync(log, '', { flag: 'wx', mode: 0o600 })
const pnpmCli = process.env.DSHM_PNPM_CLI
assert.ok(pnpmCli, 'Select the installed pnpm CLI for the normal dsh script entry')
const child = spawn(process.execPath, [pnpmCli, 'dsh',
  'web', '--no-open', '--host', '127.0.0.1', '--port', String(port)],
  { cwd: root, env: { ...process.env, DSH_HOME: resolve(root, 'home') }, windowsHide: true })
const state = { run, pid: child.pid, port, version: alpha2 ? '0.2.1-alpha.2' : '0.2.1-alpha.1',
  entry: 'pnpm dsh web', privateLog: log, stage: 'starting' }
const save = () => writeFileSync(receipt, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
save()
let output = '', probed = false
child.stdout.setEncoding('utf8')
child.stderr.setEncoding('utf8')
const receive = (text, stdout) => {
  appendFileSync(log, text)
  if (!stdout) return
  output = (output + text).slice(-16384)
  const url = output.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1]
  if (!url || probed) return
  assert.equal(new URL(url).origin, `http://127.0.0.1:${port}`)
  probed = true
  void (async () => {
    const login = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) })
    const cookie = login.headers.get('set-cookie')?.split(';')[0]
    state.loginStatus = login.status
    if (!cookie || login.status !== 303) throw Error('official_login_failed')
    const response = await fetch(`http://127.0.0.1:${port}/api/dsh-mobile`,
      { headers: { cookie }, signal: AbortSignal.timeout(10000) })
    state.pluginStatus = response.status
    const body = await response.json()
    state.pluginConfigured = body.configured
    state.pluginConnection = body.connection
    state.pluginError = typeof body.error === 'string' ? body.error : undefined
    state.stage = response.ok ? 'plugin-ready' : 'plugin-unavailable'
    save()
    console.log(JSON.stringify(state))
  })().catch(error => { state.stage = 'probe-failed'; state.failure = error.name; save(); console.log(JSON.stringify(state)) })
}
child.stdout.on('data', text => receive(text, true))
child.stderr.on('data', text => receive(text, false))
child.on('error', error => { state.stage = 'launch-failed'; state.failure = error.code; save(); console.log(JSON.stringify(state)) })
child.on('exit', (code, signal) => { state.stage = 'exited'; state.exitCode = code; state.signal = signal; save(); process.exitCode = code ?? 1 })
process.on('SIGINT', () => child.kill())
process.on('SIGTERM', () => child.kill())

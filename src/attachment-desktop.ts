import { randomUUID } from 'node:crypto'
import { mkdir, lstat, realpath, rm, open, utimes, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import type { Operation } from '@dsh-mobile/protocol'
import { attachmentSource, type AttachmentRequest, type AttachmentServices } from './attachment-preview.js'
import type { WorkspaceDesktopServices } from './workspace-desktop.js'

type Prepare = Extract<Operation, { method: 'remote.prepareDesktopAttachment' }>
type Open = Extract<Operation, { method: 'remote.openDesktopAttachment' }>
type DesktopServices = Pick<WorkspaceDesktopServices, 'sessions'>
type Snapshot = { owner: string; request: AttachmentRequest; ref: string; fileName: string;
  services: DesktopServices; expires: number }
const COPY_TTL = 3600000
let cacheWork: Promise<unknown> = Promise.resolve()
const serialize = <T>(work: () => Promise<T>): Promise<T> => {
  const result = cacheWork.then(work); cacheWork = result.catch(() => {}); return result
}

/** 每个 Host 进程最多八份 256 MiB 副本；原件不可变，副本过期按需清理。 */
export class AttachmentCopies {
  constructor(private root = join(tmpdir(), 'dshm-attachment-copies-v1', String(process.pid))) {}

  private async directory() {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    if ((await lstat(this.root)).isSymbolicLink()) throw new Error('remote_desktop_unavailable')
    return realpath(this.root)
  }

  private async removeSlot(directory: string) {
    const root = await this.directory()
    // 只删除本服务直接创建的槽位；不跟随替换后的链接或任意用户路径。
    if (dirname(resolve(directory)) !== root || !/^copy-[0-7]$/.test(directory.slice(root.length + 1))) throw new Error('remote_desktop_invalid')
    try {
      if ((await lstat(directory)).isSymbolicLink() || await realpath(directory) !== directory) throw new Error('remote_desktop_invalid')
      await rm(directory, { recursive: true })
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }

  remove(directory: string) { return serialize(() => this.removeSlot(directory)) }

  private async staleProcesses() {
    // 上次进程崩溃留下的副本：只清理已退出进程且超过一小时的本服务目录。
    // PID 被复用、权限不明或链接替换时保留，不能猜测其已无使用者。
    if (this.root !== join(tmpdir(), 'dshm-attachment-copies-v1', String(process.pid))) return
    const parent = await realpath(dirname(this.root))
    for (const entry of await readdir(parent, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[1-9][0-9]{0,9}$/.test(entry.name) || Number(entry.name) === process.pid) continue
      try { process.kill(Number(entry.name), 0); continue }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') continue }
      const path = join(parent, entry.name)
      try {
        if (Date.now() - (await lstat(path)).mtimeMs > COPY_TTL && await realpath(path) === path)
          await rm(path, { recursive: true })
      } catch { /* 被默认应用锁定时留待下次，不扩大当前进程的八个槽位。 */ }
    }
  }

  reserve() { return serialize(async () => {
    const root = await this.directory()
    await this.staleProcesses()
    for (let index = 0; index < 8; index++) {
      const directory = join(root, `copy-${index}`)
      try {
        const stat = await lstat(directory)
        if (!stat.isDirectory() || stat.isSymbolicLink()) continue
        if (Date.now() - stat.mtimeMs <= COPY_TTL) continue
        await this.removeSlot(directory)
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') continue }
      try { await mkdir(directory, { mode: 0o700 }); return directory }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error }
    }
    throw new Error('remote_desktop_copy_capacity')
  }) }
}

function fileName(ref: Awaited<ReturnType<typeof attachmentSource>>['ref']) {
  if (ref.mediaType) return `image.${ref.mediaType.split('/')[1]}`
  const name = ref.name
  // 已保存的原附件应是叶文件名；其他 provider 返回非法名字时拒绝，绝不解释为路径。
  if (!name || /[\\/<>:"|?*\x00-\x1f\x7f]/.test(name) || /[. ]$/.test(name)
    || /^(con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])([. ]|$)/i.test(name)
    || Buffer.byteLength(name) > 255) throw new Error('remote_attachment_invalid')
  return name
}

export class AttachmentDesktop {
  private snapshots = new Map<string, Snapshot>()
  private lifetime = new AbortController()
  private readers = 0
  constructor(private attachments: AttachmentServices,
    private provider: () => DesktopServices | undefined, private copies = new AttachmentCopies()) {}

  private current(services: DesktopServices, signal: AbortSignal) {
    signal.throwIfAborted()
    if (this.provider() !== services || !services.sessions.workspaceDesktop().available) throw new Error('remote_desktop_unavailable')
  }

  async prepare(owner: string, operation: Prepare, signal: AbortSignal) {
    signal = AbortSignal.any([signal, this.lifetime.signal])
    signal.throwIfAborted()
    for (const [id, item] of this.snapshots) if (item.owner === owner || item.expires <= Date.now()) this.snapshots.delete(id)
    const services = this.provider()
    if (!services) throw new Error('remote_desktop_unavailable')
    this.current(services, signal)
    if (this.readers >= 2) throw new Error('remote_desktop_busy')
    this.readers++
    try {
      const { method: _, ...request } = operation
      const { ref } = await attachmentSource(this.attachments, request, signal)
      this.current(services, signal)
      if (this.snapshots.size >= 128) throw new Error('remote_desktop_busy')
      const snapshot = randomUUID(), name = fileName(ref)
      this.snapshots.set(snapshot, { owner, request, ref: JSON.stringify(ref), fileName: name, services, expires: Date.now() + 300000 })
      return { ...services.sessions.workspaceDesktop(), snapshot, fileName: name, attachmentCopy: true }
    } finally { this.readers-- }
  }

  async open(owner: string, operation: Open, signal: AbortSignal) {
    signal = AbortSignal.any([signal, this.lifetime.signal, AbortSignal.timeout(25000)])
    signal.throwIfAborted()
    const snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner || snapshot.request.sessionId !== operation.sessionId) throw new Error('remote_desktop_stale')
    this.snapshots.delete(operation.snapshot)
    if (snapshot.expires <= Date.now()) throw new Error('remote_desktop_stale')
    this.current(snapshot.services, signal)
    if (this.readers >= 2) throw new Error('remote_desktop_busy')
    this.readers++
    let directory: string | undefined, opening = false
    try {
      const source = await attachmentSource(this.attachments, snapshot.request, signal)
      if (JSON.stringify(source.ref) !== snapshot.ref) throw new Error('remote_desktop_file_changed')
      this.current(snapshot.services, signal)
      directory = await this.copies.reserve()
      const path = join(directory, snapshot.fileName), file = await open(path, 'wx', 0o600)
      let offset = 0
      try {
        for await (const bytes of source.chunks) {
          signal.throwIfAborted()
          if (offset + bytes.byteLength > source.ref.bytes) throw new Error('remote_attachment_invalid')
          let written = 0
          while (written < bytes.byteLength) {
            signal.throwIfAborted()
            const result = await file.write(bytes, written, bytes.byteLength - written)
            if (!result.bytesWritten) throw new Error('remote_attachment_invalid')
            written += result.bytesWritten
          }
          offset += bytes.byteLength
        }
        if (offset !== source.ref.bytes) throw new Error('remote_attachment_invalid')
      } finally { await file.close() }
      // provider 可能在 EOF 才报摘要错误；迟到授权失败也必须发生在原生副作用之前。
      await source.check()
      this.current(snapshot.services, signal)
      const now = new Date(); await utimes(directory, now, now)
      signal.throwIfAborted()
      opening = true
      await snapshot.services.sessions.openWorkspacePath({ path }, signal)
      signal.throwIfAborted()
      return { opened: true }
    } finally {
      this.readers--
      // 打开结果未知时也保留副本，不在默认应用尚未读取时删除。满额/锁定时拒绝新增。
      if (directory && !opening) await this.copies.remove(directory)
    }
  }

  dispose() { this.lifetime.abort(); this.snapshots.clear() }
}

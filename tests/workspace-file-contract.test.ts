import { expect, test } from 'vitest'
import { workspaceFilePayload, workspaceFileResponse } from '../src/workspace-file-contract.js'

test('固定新版只转换已有有界读取参数，不改调用者对象和其他接口', () => {
  const payload = { args: { workspaceFileScopeId: 's', path: 'a.txt', range: { offset: 2, length: 3 } } }
  const before = structuredClone(payload)
  expect(workspaceFilePayload('0.2.1-alpha.1', 'workspaceFiles/readBytes', payload)).toEqual({
    args: { workspaceFileScopeId: 's', path: 'a.txt', options: { range: { offset: 2, length: 3 } } },
  })
  expect(payload).toEqual(before)
  for (const version of ['0.1.6-alpha.2', '0.2.2'])
    expect(workspaceFilePayload(version, 'workspaceFiles/readBytes', payload)).toBe(payload)
  expect(workspaceFilePayload('0.2.1-alpha.1', 'workspaceFiles/stat', payload)).toBe(payload)
  const native = { args: { workspaceFileScopeId: 's', path: 'a.txt', options: { range: { offset: 0, length: 1 } } } }
  expect(workspaceFilePayload('0.2.1-alpha.1', 'workspaceFiles/readBytes', native)).toBe(native)
})

test('原multipart只解包固定data附件，保留原错误并拒绝超限或伪造路径', async () => {
  const id = 'test', signal = new AbortController().signal
  const response = (bytes: Uint8Array, changes = {}) => {
    const form = new FormData()
    form.set('metadata', JSON.stringify({ type: 'server-response', rpcId: id,
      result: { ok: true, value: { absolutePath: '/work/a', version: 'v1', offset: 0, eof: true, bytes: bytes.length, data: null } },
      attachments: [{ path: ['data'], codec: 'bytes', part: 'bytes-0' }], ...changes }))
    form.set('bytes-0', new Blob([new Uint8Array(bytes)]))
    return new Response(form)
  }
  const bytes = Buffer.from('中文 🐳\u0000')
  expect(await workspaceFileResponse(response(bytes), id, signal)).toMatchObject({
    rpcId: id, result: { ok: true, value: { data: bytes.toString('base64'), bytes: bytes.length } },
  })
  for (const changes of [{ rpcId: 'other' }, { attachments: [{ path: ['private'], codec: 'bytes', part: 'bytes-0' }] },
    { attachments: [] }, { attachments: undefined },
    { attachments: { 0: { path: ['data'], codec: 'bytes', part: 'bytes-0' }, length: 1 } },
    { result: { ok: true, value: { data: 'already filled' } } }])
    await expect(workspaceFileResponse(response(bytes, changes), id, signal)).rejects.toThrow('invalid_remote_response')
  await expect(workspaceFileResponse(response(Buffer.alloc(65537)), id, signal)).rejects.toThrow('invalid_remote_response')
  const failure = { type: 'server-response', rpcId: id, result: { ok: false, error: { code: 'workspace-file/not-found' } } }
  expect(await workspaceFileResponse(Response.json(failure), id, signal)).toEqual(failure)
  const controller = new AbortController(); controller.abort()
  await expect(workspaceFileResponse(response(bytes), id, controller.signal)).rejects.toThrow()
})

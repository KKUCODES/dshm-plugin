import { expect, test } from 'vitest'
import { UploadBody } from '../src/upload-body.js'

test('upload credits bound the unread queue, and consumption returns only the used credit', async () => {
  const credits: number[] = [], controller = new AbortController()
  const upload = new UploadBody(controller.signal, count => credits.push(count))
  for (let i = 0; i < 4; i++) upload.push(Buffer.from([i]).toString('base64'))
  expect(() => upload.push('eA==')).toThrow('invalid_upload_chunk')
  expect(credits).toEqual([])
  const reader = upload.body.getReader()
  expect((await reader.read()).value).toEqual(Buffer.from([0]))
  expect(credits).toEqual([1])
  upload.push('eA=='); upload.end()
  const values: number[] = []
  for (;;) { const item = await reader.read(); if (item.done) break; values.push(...item.value) }
  expect(values).toEqual([1, 2, 3, 120])
  expect(() => upload.end()).toThrow('invalid_upload_end')
})

test('disconnect rejects the pending body read, discards queued bytes and cannot resume after end', async () => {
  const controller = new AbortController(), upload = new UploadBody(controller.signal, () => {})
  const reader = upload.body.getReader(), pending = reader.read()
  controller.abort(); await expect(pending).rejects.toThrow('remote_upload_cancelled')
  expect(() => upload.push('eA==')).toThrow('invalid_upload_chunk')
  const bufferedController = new AbortController(), buffered = new UploadBody(bufferedController.signal, () => {})
  buffered.push('eA=='); buffered.end(); bufferedController.abort()
  await expect(buffered.body.getReader().read()).rejects.toThrow('remote_upload_cancelled')
})

test('rejects noncanonical or oversized base64 and disposes a cancelled consumer', async () => {
  const upload = new UploadBody(new AbortController().signal, () => {})
  for (const value of ['', 'eA', 'eB==', Buffer.alloc(65537).toString('base64')]) expect(() => upload.push(value)).toThrow('invalid_upload_chunk')
  await upload.body.cancel()
  expect(() => upload.push('eA==')).toThrow('invalid_upload_chunk')
})

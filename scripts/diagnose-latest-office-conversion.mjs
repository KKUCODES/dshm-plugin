// 对原失败工作区做独立原转换器对照；诊断结果不计为 Remote/Android 验收通过。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, statfs } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const homes = resolve(runtime, 'relay-homes'), home = resolve(process.argv[2] ?? '');
assert.equal(process.argv.length, 3);
const owner = relative(homes, home);
assert.match(owner, /^[0-9a-f-]{36}$/); assert.ok(!isAbsolute(owner));
assert.equal(resolve(process.env.TEMP), resolve(home, 'office-engine-tmp'));
assert.equal(resolve(process.env.TMP), resolve(home, 'office-engine-tmp'));
const require = createRequire(resolve(runtime, 'package.json'));
const { createConverter } = await import(pathToFileURL(require.resolve('@deepseek-ai/libreoffice-kit')).href);
const output = await mkdtemp(resolve(home, 'office-diagnosis-'));
const report = { at: new Date().toISOString(), home, output, fullAcceptancePassed: false, rows: [] };
const free = async () => { const fs = await statfs(home); return fs.bavail * fs.bsize; };
const errorInfo = error => error && { name: error.name, code: error.code,
  message: String(error.message).slice(0, 1200), cause: error.cause ? errorInfo(error.cause) : undefined };
const converter = await createConverter({ timeoutMs: 60000, maxInputBytes: 50 * 1024 * 1024,
  maxOutputBytes: 100 * 1024 * 1024, maxImageResolution: 192, maxArchiveEntries: 10000,
  maxUncompressedBytes: 250 * 1024 * 1024, maxFontFiles: 20000,
  maxFontFileBytes: 256 * 1024 * 1024, maxLoadedFontBytes: 512 * 1024 * 1024 });
try {
  for (const extension of ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt']) {
    const inputPath = resolve(home, 'test-project', 'latest-native-office.' + extension);
    const input = await readFile(inputPath), row = { extension, inputBytes: input.length,
      inputSha256: createHash('sha256').update(input).digest('hex'), freeBefore: await free() };
    try {
      const outputPath = resolve(output, extension + '.pdf');
      const result = await converter.render({ inputPath, outputPath });
      const pdf = await readFile(outputPath);
      assert.match(pdf.subarray(0, 8).toString('ascii'), /^%PDF-\d\.\d/u);
      Object.assign(row, { backend: result.backend, bytes: pdf.length,
        sha256: createHash('sha256').update(pdf).digest('hex'), converted: true });
    } catch (error) { row.error = errorInfo(error); row.converted = false; }
    assert.deepEqual(await readFile(inputPath), input);
    row.sourcePreserved = true; row.freeAfter = await free(); report.rows.push(row);
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(row));
  }
} finally { await converter.dispose(); }
console.log(JSON.stringify({ report: resolve(output, 'report.json'), fullAcceptancePassed: false }));

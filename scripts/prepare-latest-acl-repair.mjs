// 只生成人工运行的工具，不启动 DSH、不执行修复，也不读取用户凭据。
import assert from 'node:assert/strict';
import { prepareLatestAclRepair } from '../compatibility/latest-upstream/acl-repair.mjs';

assert.equal(process.argv.length, 3, 'Usage: node scripts/prepare-latest-acl-repair.mjs <sandbox-package-root>');
const prepared = await prepareLatestAclRepair({ packageRoot: process.argv[2] });
console.log(JSON.stringify({ ...prepared, permissionsChanged: false, manualExecutionRequired: true }));

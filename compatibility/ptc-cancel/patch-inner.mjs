import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patch as install } from './patch.mjs';
import * as specification from './prepare-inner.mjs';
export const patch = (action, target, write) => install(action, target, write, specification);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || action !== 'plan' && stopped !== '--stopped') throw Error('Stop DSH before writing; pass --stopped');
  console.log(JSON.stringify(await patch(action, target)));
}

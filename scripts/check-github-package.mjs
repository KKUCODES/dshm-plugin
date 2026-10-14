import { resolve } from 'node:path';
import { validateGithubPackage } from './github-package.mjs';

console.log(JSON.stringify(await validateGithubPackage(resolve(import.meta.dirname, '..'))));

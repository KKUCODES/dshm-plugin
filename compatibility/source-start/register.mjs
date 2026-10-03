import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire, isBuiltin, registerHooks } from 'node:module';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, isInternalThread } from 'node:worker_threads';

/** tsx's CLI preload does not register a fresh async transformer in ordinary Workers on Node 24.11.0. */
export async function initializeSourceStartup(installationRoot) {
  if (isInternalThread) return;
  if (!isMainThread) {
    const require = createRequire(resolve(installationRoot, 'package.json'));
    const { register } = await import(pathToFileURL(require.resolve('tsx/esm/api')).href);
    register({ tsconfig: resolve(installationRoot, 'tsconfig.json') });
  }
  return registerSourceResolution(installationRoot);
}

/** Keep the original package/version decision; canonicalize only this checkout's own lib entry. */
export function registerSourceResolution(installationRoot) {
  const root = realpathSync(installationRoot);
  const require = createRequire(resolve(root, 'package.json'));
  // Use the same parser as this installation's tsx, including its inherited path mappings.
  const tsxRequire = createRequire(require.resolve('tsx/package.json'));
  const { getTsconfig, resolvePathAlias } = tsxRequire('get-tsconfig');
  if (typeof resolvePathAlias !== 'function') throw Error('Unsupported tsx/get-tsconfig source resolver');
  const config = getTsconfig(root);
  if (!config?.config.compilerOptions?.paths) throw Error('DSH source path mappings are missing');
  const inside = path => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel); };
  const packages = new Map();
  const packageOf = path => {
    let dir = dirname(path);
    const visited = [];
    while (inside(dir)) {
      if (packages.has(dir)) { const found = packages.get(dir); for (const item of visited) packages.set(item, found); return found; }
      visited.push(dir);
      const manifest = resolve(dir, 'package.json');
      if (existsSync(manifest)) {
        const found = { dir: realpathSync(dir), name: JSON.parse(readFileSync(manifest, 'utf8')).name };
        for (const item of visited) packages.set(item, found);
        return found;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    for (const item of visited) packages.set(item, undefined);
  };
  return registerHooks({ resolve(specifier, context, nextResolve) {
    const selected = nextResolve(specifier, context);
    if (!selected.url.startsWith('file:') || isBuiltin(specifier) || /^[.#/]|:/.test(specifier)) return selected;
    const selectedUrl = new URL(selected.url);
    if (selectedUrl.search || selectedUrl.hash) return selected;
    const selectedPath = fileURLToPath(selectedUrl);
    if (!inside(selectedPath)) return selected;
    const owner = packageOf(selectedPath);
    const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
    if (!owner || owner.name !== name || !relative(owner.dir, selectedPath).replaceAll('\\', '/').startsWith('lib/')) return selected;
    for (const candidate of resolvePathAlias(config, specifier)) {
      let source;
      const cjs = context.conditions.includes('require');
      const sourceFile = cjs ? [candidate, `${candidate}.ts`, `${candidate}.tsx`, resolve(candidate, 'index.ts'), resolve(candidate, 'index.tsx')]
        .find(path => existsSync(path) && statSync(path).isFile()) : undefined;
      if (cjs && !sourceFile) continue;
      try { source = nextResolve(cjs ? sourceFile : pathToFileURL(candidate).href, context); }
      catch (error) {
        if (['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error.code)) continue;
        throw error;
      }
      if (!source.url.startsWith('file:')) continue;
      const sourcePath = fileURLToPath(source.url);
      if (!inside(sourcePath) || packageOf(sourcePath)?.dir !== owner.dir) continue;
      return source;
    }
    return selected;
  } });
}

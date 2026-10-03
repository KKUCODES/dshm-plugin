import { build } from 'esbuild'

await build({ entryPoints: ['src/index.ts'], outfile: 'dist/index.js', bundle: true, platform: 'node', target: 'node22',
  format: 'esm', sourcemap: true, external: ['@deepseek-ai/*', 'ws', 'zod'] })
// 与 dsh 上游 tsdown.client.ts 的 ModuleLoader 注册格式一致。
await build({ entryPoints: ['src/client/index.tsx'], outfile: 'dist/client.js', bundle: true, platform: 'browser',
  target: 'es2022', format: 'cjs', sourcemap: true, external: ['react', 'react/jsx-runtime'],
  banner: { js: 'window.__ModuleLoader__.load({id:"@dsh-mobile/plugin",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' } })

import { transform as desktop, transformResolver } from '../desktop-apps/changes.mjs';
import { transform as icons } from '../desktop-app-icons/changes.mjs';

/** 复用已交付的服务边界；新版 SSH 来源、网页信任检查和平台启动器仍由原插件持有。 */
export const sourceDesktopChanges = [
  { path: 'packages/host/open-in-app/src/index.ts',
    hash: '82c9b4307297af905eb53b96a4d8111ea6e6931d90d84f0619a307a2c0502eaf',
    transform: source => icons(desktop(source)) },
  { path: 'packages/host/open-in-app/src/resolver.ts',
    hash: 'd6d6180c1f02d1da3a6563f8c59f0b31d3256713bf8fb5394c5a7fe46de946fa',
    transform: transformResolver },
].map(change => ({ ...change, patch: 'desktop-apps-icons',
  name: '@deepseek-ai/dsh-host-open-in-app', package: 'packages/host/open-in-app' }));

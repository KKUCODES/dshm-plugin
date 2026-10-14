import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
import type { ProfileSettings } from './profile-settings.js';
type Runtime = Pick<LlmRuntime, 'listProviders' | 'listConfigurableProviders' | 'discoverModels'>;
/** 新版目录/发现按实例 ID 寻址，Remote 仍只暴露已核验的固定设置空间。 */
export declare function profileProviders(runtime: Runtime, settings: ProfileSettings): Runtime;
export {};

import { type Context } from '@deepseek-ai/cordis';
import type { PluginConfig } from './config.js';
export declare const name = "dsh-mobile";
export declare const inject: string[];
export type Config = PluginConfig;
export declare const Config: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<{
    enrollmentRef: import("@deepseek-ai/schemastery").default<string, string>;
}>, Schemastery.ObjectT<{
    enrollmentRef: import("@deepseek-ai/schemastery").default<string, string>;
}>>;
export declare function apply(ctx: Context, config: Config): Promise<void>;

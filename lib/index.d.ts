import { type Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type { PluginConfig } from './config.js';
export declare const name = "dsh-mobile";
export declare const inject: string[];
export type Config = PluginConfig;
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    enrollmentRef: Schema<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    enrollmentRef: Schema<string, string, "defined">;
}>>, "plain">;
export declare function apply(ctx: Context, config: Config): Promise<void>;

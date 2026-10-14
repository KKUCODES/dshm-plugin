import type { Context } from '@deepseek-ai/cordis';
import type { Operation } from "./protocol/index.js";
/** 与 desktop-apps-v1 兼容补丁一致；只在电脑内部注入，不开放通用启动 RPC。 */
export interface DesktopApplications {
    list(signal?: AbortSignal): Promise<readonly string[]>;
    icon?(appId: string, signal?: AbortSignal): Promise<{
        contentType: 'image/png' | 'image/svg+xml';
        bytes: Buffer;
    } | null>;
    open(appId: string, path: string, signal?: AbortSignal): Promise<{
        status: number;
        payload: {
            ok: true;
        } | {
            code: string;
            message: string;
        };
    }>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        dshmDesktopApps: DesktopApplications;
    }
}
export interface DesktopAppServices {
    apps: DesktopApplications;
    sessions: Pick<Context['sessionController'], 'list' | 'workspaceDesktop'>;
    fs: Pick<Context['fs'], 'resolve' | 'stat' | 'processPath' | 'processPathFromHostPath'>;
}
type Prepare = Extract<Operation, {
    method: 'remote.prepareDesktopApp';
}>;
type Open = Extract<Operation, {
    method: 'remote.openDesktopApp';
}>;
export declare class DesktopApps {
    private provider;
    private snapshots;
    private preparing;
    private lifetime;
    constructor(provider: () => DesktopAppServices | undefined);
    private check;
    private services;
    private workspace;
    list(sessionId: string, caller: AbortSignal): Promise<{
        apps: readonly string[];
        workspacePath: string;
        name: string;
        available: boolean;
        fileManager: "finder" | "explorer" | "directory" | null;
    }>;
    prepare(owner: string, operation: Prepare, caller: AbortSignal): Promise<{
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        appId: string;
        workspacePath: string;
        name: string;
        available: boolean;
        fileManager: "finder" | "explorer" | "directory" | null;
    }>;
    icon(sessionId: string, appId: string, caller: AbortSignal): Promise<{
        appId: string;
        contentType: null;
        data: null;
    } | {
        appId: string;
        contentType: "image/png" | "image/svg+xml";
        data: string;
    }>;
    open(owner: string, operation: Open, caller: AbortSignal): Promise<{
        opened: boolean;
    }>;
    dispose(): void;
}
export {};

import type { SessionController } from '@deepseek-ai/dsh-api-session-controller';
import { type HostFrame } from "./protocol/index.js";
export type SessionService = Pick<SessionController, 'list' | 'page' | 'follow' | 'control' | 'prompt' | 'cancel'>;
/** 适配已发布的 SessionController，取消传输只中止订阅，停止 Agent 必须显式 session.cancel。 */
export declare class SessionAdapter {
    private service;
    private requests;
    constructor(service: SessionService);
    receive(raw: unknown, send: (frame: HostFrame) => void): Promise<void>;
    dispose(): void;
}

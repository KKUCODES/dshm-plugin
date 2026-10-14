import { type SessionService } from './session-adapter.js';
import { type RemoteServices } from './remote-adapter.js';
export type ConnectionState = 'disabled' | 'connecting' | 'online' | 'reconnecting' | 'credential_rejected';
/** 每次重连重建订阅上下文；绝不自动重发用户的 prompt。 */
export declare class Relay {
    private service;
    private services?;
    private socket?;
    private retry?;
    private heartbeat?;
    private adapter?;
    private remote?;
    private stopped;
    private attempts;
    state: ConnectionState;
    private pluginOperations?;
    constructor(service: SessionService, services?: RemoteServices | undefined);
    start(origin: string, token: string, hostId?: string): void;
    stop(): void;
}

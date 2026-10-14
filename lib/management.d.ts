import { type CredentialProvider } from '@deepseek-ai/dsh-credentials';
import type { SessionService } from './session-adapter.js';
import type { PluginConfig } from './config.js';
import type { RemoteServices } from './remote-adapter.js';
type Credentials = Pick<CredentialProvider, 'readRecord' | 'modifyRecord' | 'resolve'>;
export declare class Management {
    private credentials;
    private config;
    private saved?;
    private relay;
    private operation;
    private disposed;
    private lifetime;
    private revision;
    get configRevision(): `${string}-${string}-${string}-${string}-${string}`;
    constructor(credentials: Credentials, service: SessionService, config: PluginConfig, services?: RemoteServices);
    initialize(): Promise<void>;
    private origin;
    private api;
    private save;
    private serverInfo;
    private enroll;
    status(): Promise<{
        configured: boolean;
        connection: import("./relay.js").ConnectionState;
        devices: never[];
    } | {
        devices: {
            id: string;
            name: string;
            fingerprint: string;
            status: "pending" | "active" | "revoked";
            management: boolean;
            expiresAt: string;
        }[];
        configured: boolean;
        connection: import("./relay.js").ConnectionState;
        origin: string;
        name: string;
        hostId: string;
        enabled: boolean;
        configRevision: `${string}-${string}-${string}-${string}-${string}`;
    } | {
        devices: never[];
        deviceError: string;
        configured: boolean;
        connection: import("./relay.js").ConnectionState;
        origin: string;
        name: string;
        hostId: string;
        enabled: boolean;
        configRevision: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    private action;
    handle(request: Request): Promise<Response>;
    dispose(): void;
}
export {};

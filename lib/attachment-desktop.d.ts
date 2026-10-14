import type { Operation } from "./protocol/index.js";
import { type AttachmentServices } from './attachment-preview.js';
import type { WorkspaceDesktopServices } from './workspace-desktop.js';
type Prepare = Extract<Operation, {
    method: 'remote.prepareDesktopAttachment';
}>;
type Open = Extract<Operation, {
    method: 'remote.openDesktopAttachment';
}>;
type DesktopServices = Pick<WorkspaceDesktopServices, 'sessions'>;
/** 每个 Host 进程最多八份 256 MiB 副本；原件不可变，副本过期按需清理。 */
export declare class AttachmentCopies {
    private root;
    constructor(root?: string);
    private directory;
    private removeSlot;
    remove(directory: string): Promise<void>;
    private staleProcesses;
    reserve(): Promise<string>;
}
export declare class AttachmentDesktop {
    private attachments;
    private provider;
    private copies;
    private snapshots;
    private lifetime;
    private readers;
    constructor(attachments: AttachmentServices, provider: () => DesktopServices | undefined, copies?: AttachmentCopies);
    private current;
    prepare(owner: string, operation: Prepare, signal: AbortSignal): Promise<{
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        fileName: string;
        attachmentCopy: boolean;
        name: string;
        available: boolean;
        fileManager: "finder" | "explorer" | "directory" | null;
    }>;
    open(owner: string, operation: Open, signal: AbortSignal): Promise<{
        opened: boolean;
    }>;
    dispose(): void;
}
export {};

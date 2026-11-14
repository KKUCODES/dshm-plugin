import type { SessionId } from '@deepseek-ai/dsh-session';
import type { AttachmentStore, FileAttachmentRef, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import { type HostFrame, type Operation } from "./protocol/index.js";
import type { ResourceWindow } from './resource-window.js';
export interface AttachmentServices {
    sessions: {
        inspect(sessionId: SessionId, signal: AbortSignal): Promise<{
            events: readonly unknown[];
        }>;
        attachment(request: {
            sessionId: SessionId;
            attachmentId: FileAttachmentRef['attachmentId'];
        }, signal: AbortSignal): Promise<{
            attachment: unknown;
            data: string;
        }>;
    };
    store: Pick<AttachmentStore, 'readFileStream'>;
}
export type AttachmentRequest = Omit<Extract<Operation, {
    method: 'remote.attachment';
}>, 'method'>;
type Request = Extract<Operation, {
    method: 'remote.attachment';
}>;
/** 只检查上游定义的消息内容位置；不把任意 JSON 中碰巧出现的 ID 当成授权。 */
export declare function findFile(events: readonly unknown[], request: Pick<Request, 'attachmentId' | 'name'>): FileAttachmentRef;
export declare function findImage(events: readonly unknown[], attachmentId: string): ImageAttachmentRef;
/** 预览与电脑副本共用原会话归属和 provider；调用方必须读到 EOF 并完成 check。 */
export declare function attachmentSource(services: AttachmentServices, request: AttachmentRequest, signal: AbortSignal): Promise<{
    ref: {
        attachmentId: string;
        bytes: number;
        name?: string | undefined;
        mediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | undefined;
        width?: number | undefined;
        height?: number | undefined;
        originalDimensions?: {
            width: number;
            height: number;
        } | undefined;
    };
    chunks: AsyncIterable<Uint8Array<ArrayBufferLike>>;
    check: () => Promise<void>;
}>;
/** 附件内容由原 provider 校验；完整性失败即使发生在最后一块后，也不能发成功结束。 */
export declare function streamAttachment(services: AttachmentServices, id: string, request: Request, signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void): Promise<void>;
export {};

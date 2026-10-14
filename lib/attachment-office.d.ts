import type { OfficeToPdf } from '@deepseek-ai/dsh-office-to-pdf';
import { type HostFrame, type Operation } from "./protocol/index.js";
import { type AttachmentServices } from './attachment-preview.js';
import type { ResourceWindow } from './resource-window.js';
export type AttachmentOfficeProvider = Pick<OfficeToPdf, 'convert' | 'generation'>;
type Request = Extract<Operation, {
    method: 'remote.attachmentOffice';
}>;
/** 先验证会话引用；只向原转换队列提供授权附件字节，不把显示名解释为电脑文件路径。 */
export declare function streamAttachmentOffice(services: AttachmentServices, getProvider: () => AttachmentOfficeProvider | undefined, id: string, request: Request, signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void): Promise<void>;
export {};

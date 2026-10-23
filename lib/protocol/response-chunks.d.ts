import { z } from 'zod';
export declare const RESPONSE_CHUNKS_VERSION = 1;
export declare const RESPONSE_CHUNK_BYTES: number;
export declare const RESPONSE_CHUNK_WINDOW = 4;
export declare const MAX_RESPONSE_BYTES: number;
export declare const MAX_RESPONSE_BUFFER_BYTES: number;
export declare const MAX_RESPONSE_TRANSFERS = 4;
export declare const RESPONSE_IDLE_MS = 30000;
export declare const RESPONSE_TOTAL_MS = 120000;
export declare const responseStartSchema: z.ZodObject<{
    type: z.ZodLiteral<"responseStart">;
    kind: z.ZodEnum<{
        result: "result";
        event: "event";
    }>;
    bytes: z.ZodNumber;
    sha256: z.ZodString;
    id: z.ZodUUID;
    transferId: z.ZodUUID;
}, z.core.$strict>;
export declare const responseChunkSchema: z.ZodObject<{
    type: z.ZodLiteral<"responseChunk">;
    index: z.ZodNumber;
    data: z.ZodString;
    id: z.ZodUUID;
    transferId: z.ZodUUID;
}, z.core.$strict>;
export declare const responseEndSchema: z.ZodObject<{
    type: z.ZodLiteral<"responseEnd">;
    id: z.ZodUUID;
    transferId: z.ZodUUID;
}, z.core.$strict>;
export declare const responseAckSchema: z.ZodObject<{
    type: z.ZodLiteral<"responseAck">;
    index: z.ZodNumber;
    id: z.ZodUUID;
    transferId: z.ZodUUID;
}, z.core.$strict>;
export type ResponseStart = z.infer<typeof responseStartSchema>;
export type ResponseChunk = z.infer<typeof responseChunkSchema>;
export type ResponseEnd = z.infer<typeof responseEndSchema>;
export type ResponseAck = z.infer<typeof responseAckSchema>;
export type ResponsePart = ResponseStart | ResponseChunk | ResponseEnd;
/** 中转和手机共用顺序/窗口约束；中转只保存计数，不保存或重组聊天正文。 */
export declare class ResponseSequence {
    readonly start: ResponseStart;
    received: number;
    acknowledged: number;
    readonly startedAt: number;
    touchedAt: number;
    constructor(start: ResponseStart, stream: boolean);
    check(frame: {
        transferId: string;
    }, now?: number): void;
    chunk(frame: ResponseChunk): Uint8Array;
    ack(frame: ResponseAck): void;
    end(frame: ResponseEnd): void;
}
/** 只向业务层交付校验后的完整值；取消/重连释放所有半成品，不跨连接续接。 */
export declare class ResponseAssembler {
    private entries;
    private reserved;
    get bytes(): number;
    get size(): number;
    accept(frame: ResponsePart, stream: boolean): Promise<{
        ack?: ResponseAck;
        frame?: {
            type: 'result' | 'event';
            id: string;
            value: unknown;
        };
    }>;
    cancel(id: string): void;
    clear(): void;
}

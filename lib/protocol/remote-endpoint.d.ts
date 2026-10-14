import { z } from 'zod';
export declare const computerEndpointTargetSchema: z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
    provider: z.ZodString;
}, z.core.$strict>]>;
export declare const computerEndpointUrlSchema: z.ZodString;
export declare const computerEndpointReadSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.endpointRead">;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
    resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>;
export declare const computerEndpointWriteSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.endpointWrite">;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
    resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
    confirmed: z.ZodLiteral<true>;
    change: z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"set">;
        value: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"unset">;
    }, z.core.$strict>], "op">;
}, z.core.$strict>;
export type ComputerEndpointWrite = z.infer<typeof computerEndpointWriteSchema>;
export declare const computerEndpointViewSchema: z.ZodObject<{
    snapshot: z.ZodUUID;
    revision: z.ZodNumber;
    writable: z.ZodBoolean;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
    applies: z.ZodEnum<{
        live: "live";
        restart: "restart";
    }>;
    protocol: z.ZodEnum<{
        provider: "provider";
        messages: "messages";
        "chat-completions": "chat-completions";
    }>;
    origin: z.ZodNullable<z.ZodString>;
    inheritedOrigin: z.ZodNullable<z.ZodString>;
    customPath: z.ZodBoolean;
    overridden: z.ZodBoolean;
    resettable: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;

import { z } from 'zod';
export declare const computerKeyTargetSchema: z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
    provider: z.ZodString;
}, z.core.$strict>]>;
export declare const computerKeyWriteSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.keyWrite">;
    snapshot: z.ZodUUID;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
    change: z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"set">;
        value: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"unset">;
    }, z.core.$strict>], "op">;
}, z.core.$strict>;
export type ComputerKeyWrite = z.infer<typeof computerKeyWriteSchema>;
export declare const computerKeyViewSchema: z.ZodObject<{
    snapshot: z.ZodUUID;
    provider: z.ZodString;
    configured: z.ZodBoolean;
    writable: z.ZodBoolean;
    target: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;

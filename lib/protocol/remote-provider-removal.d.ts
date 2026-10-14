import { z } from 'zod';
export declare const providerRemovalReadSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.providerRemovalRead">;
    provider: z.ZodString;
}, z.core.$strict>;
export declare const providerRemovalWriteSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.providerRemovalWrite">;
    provider: z.ZodString;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
}, z.core.$strict>;
export type ProviderRemovalWrite = z.infer<typeof providerRemovalWriteSchema>;
export declare const providerRemovalViewSchema: z.ZodObject<{
    provider: z.ZodString;
    name: z.ZodString;
    snapshot: z.ZodUUID;
    revision: z.ZodNumber;
    writable: z.ZodBoolean;
    removable: z.ZodBoolean;
    removed: z.ZodBoolean;
    keepsCredential: z.ZodBoolean;
    applies: z.ZodEnum<{
        live: "live";
        restart: "restart";
    }>;
}, z.core.$strict>;

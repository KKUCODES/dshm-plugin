import { z } from 'zod';
export declare const providerCreationWriteSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"catalog">;
    provider: z.ZodString;
    method: z.ZodLiteral<"remote.providerCreationWrite">;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    useKey: z.ZodBoolean;
    name: z.ZodString;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"custom">;
    provider: z.ZodString;
    api: z.ZodString;
    baseURL: z.ZodString;
    models: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        contextWindow: z.ZodOptional<z.ZodNumber>;
        input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            text: "text";
            image: "image";
        }>>>;
    }, z.core.$strict>>]>;
    method: z.ZodLiteral<"remote.providerCreationWrite">;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    useKey: z.ZodBoolean;
    name: z.ZodString;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>], "kind">;
export type ProviderCreationWrite = z.infer<typeof providerCreationWriteSchema>;
export declare const providerCreationViewSchema: z.ZodObject<{
    snapshot: z.ZodUUID;
    revision: z.ZodNumber;
    writable: z.ZodBoolean;
    applies: z.ZodEnum<{
        live: "live";
        restart: "restart";
    }>;
    keyAvailable: z.ZodBoolean;
    protocols: z.ZodArray<z.ZodString>;
    taken: z.ZodArray<z.ZodString>;
    available: z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        name: z.ZodString;
    }, z.core.$strict>>;
    created: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        useKey: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>;

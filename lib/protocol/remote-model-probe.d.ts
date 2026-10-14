import { z } from 'zod';
export declare const modelProbePrepareSchema: z.ZodObject<{
    authentication: z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"none">;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"temporary">;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"stored">;
        provider: z.ZodString;
    }, z.core.$strict>], "mode">;
    baseURL: z.ZodString;
    api: z.ZodEnum<{
        "openai-completions": "openai-completions";
        "openai-responses": "openai-responses";
        "anthropic-messages": "anthropic-messages";
    }>;
    method: z.ZodLiteral<"remote.modelProbePrepare">;
}, z.core.$strict>;
export declare const modelProbePreparedSchema: z.ZodObject<{
    authentication: z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"none">;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"temporary">;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"stored">;
        provider: z.ZodString;
    }, z.core.$strict>], "mode">;
    baseURL: z.ZodString;
    api: z.ZodEnum<{
        "openai-completions": "openai-completions";
        "openai-responses": "openai-responses";
        "anthropic-messages": "anthropic-messages";
    }>;
    snapshot: z.ZodUUID;
    expiresAt: z.ZodNumber;
}, z.core.$strict>;
export declare const modelProbeExecuteSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    mode: z.ZodLiteral<"none">;
    method: z.ZodLiteral<"remote.modelProbeExecute">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    mode: z.ZodLiteral<"stored">;
    method: z.ZodLiteral<"remote.modelProbeExecute">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    mode: z.ZodLiteral<"temporary">;
    apiKey: z.ZodString;
    method: z.ZodLiteral<"remote.modelProbeExecute">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>], "mode">;
export declare const modelProbeResultSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        contextWindow: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        inputModalities: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            text: "text";
            image: "image";
        }>>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ModelProbePrepare = z.infer<typeof modelProbePrepareSchema>;
export type ModelProbeExecute = z.infer<typeof modelProbeExecuteSchema>;
export type ModelProbePrepared = z.infer<typeof modelProbePreparedSchema>;

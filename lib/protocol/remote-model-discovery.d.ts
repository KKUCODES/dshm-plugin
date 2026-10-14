import { z } from 'zod';
export declare const providerModelsDiscoverSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.providerModelsDiscover">;
    provider: z.ZodString;
}, z.core.$strict>;
export declare const providerModelsDiscoveryViewSchema: z.ZodObject<{
    provider: z.ZodString;
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

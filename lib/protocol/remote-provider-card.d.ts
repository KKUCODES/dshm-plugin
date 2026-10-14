import { z } from 'zod';
export declare const providerCardViewSchema: z.ZodObject<{
    provider: z.ZodObject<{
        provider: z.ZodString;
        displayName: z.ZodString;
        settingsNs: z.ZodString;
        settingsPath: z.ZodArray<z.ZodString>;
        active: z.ZodBoolean;
        declared: z.ZodOptional<z.ZodBoolean>;
        error: z.ZodOptional<z.ZodLiteral<"提供方暂不可用">>;
    }, z.core.$strict>;
    configured: z.ZodBoolean;
    keyConfigured: z.ZodBoolean;
}, z.core.$strict>;

import { z } from 'zod';
export declare const modelReadinessSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        "provider-ready": "provider-ready";
        "adapter-absent": "adapter-absent";
        "credential-missing": "credential-missing";
        unavailable: "unavailable";
    }>;
}, z.core.$strict>;

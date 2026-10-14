import { z } from 'zod';
export declare const remotePresetIdSchema: z.ZodString;
export declare const presetManagementReadSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.presetManagementRead">;
    preset: z.ZodString;
}, z.core.$strict>;
export declare const presetCopySchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.presetCopy">;
    snapshot: z.ZodUUID;
    id: z.ZodString;
    name: z.ZodString;
}, z.core.$strict>;
export declare const presetDeleteSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.presetDelete">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>;
export declare const presetManagementViewSchema: z.ZodObject<{
    snapshot: z.ZodUUID;
    preset: z.ZodString;
    canCopy: z.ZodBoolean;
    canDelete: z.ZodBoolean;
    defaultAfterDelete: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type PresetCopy = z.infer<typeof presetCopySchema>;
export type PresetDelete = z.infer<typeof presetDeleteSchema>;

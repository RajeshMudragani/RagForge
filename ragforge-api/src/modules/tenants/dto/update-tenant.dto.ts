import { z } from "zod";

export const UpdateTenantDtoSchema = z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
});

export type UpdateTenantDto =
    z.infer<
        typeof UpdateTenantDtoSchema
    >;
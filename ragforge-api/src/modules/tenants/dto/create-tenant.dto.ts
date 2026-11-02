import { z } from "zod";

export const CreateTenantDtoSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
});

export type CreateTenantDto = z.infer<
    typeof CreateTenantDtoSchema
>;
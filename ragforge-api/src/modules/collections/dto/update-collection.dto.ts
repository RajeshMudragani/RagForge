import { z } from "zod";

export const UpdateCollectionDtoSchema = z.object({
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(1000).optional(),
    tenantId: z.string().uuid(),
});

export type UpdateCollectionDto =
    z.infer<
        typeof UpdateCollectionDtoSchema
    >;

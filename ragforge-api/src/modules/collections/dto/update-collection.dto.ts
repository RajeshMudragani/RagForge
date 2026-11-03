import { z } from "zod";

export const UpdateCollectionDtoSchema = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
}).refine(data => data.name !== undefined || data.description !== undefined, {
    message: "At least one field must be provided",
});

export type UpdateCollectionDto =
    z.infer<
        typeof UpdateCollectionDtoSchema
    >;

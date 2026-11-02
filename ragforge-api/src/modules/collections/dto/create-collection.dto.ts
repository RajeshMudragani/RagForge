import { z } from "zod";

export const CreateCollectionDtoSchema = z.object({
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(1000).optional(),
});

export type CreateCollectionDto =
    z.infer<
        typeof CreateCollectionDtoSchema
    >;
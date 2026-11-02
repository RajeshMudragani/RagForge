import { z } from "zod";

export const AddMetadataDtoSchema =
    z.object({
        key: z
            .string()
            .trim()
            .min(1)
            .max(255),

        value: z
            .string()
            .trim()
            .min(1)
            .max(500),
    });

export type AddMetadataDto =
    z.infer<
        typeof AddMetadataDtoSchema
    >;
import { z } from "zod";

export const BulkAddMetadataDtoSchema =
    z.object({
        metadata: z.record(
            z.string(),
            z.string(),
        ),
    });

export type BulkAddMetadataDto =
    z.infer<
        typeof BulkAddMetadataDtoSchema
    >;

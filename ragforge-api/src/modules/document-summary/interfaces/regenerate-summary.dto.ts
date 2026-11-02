import { z } from "zod";

export const RegenerateDocumentSummaryDtoSchema =
    z.object({
        documentId: z.string().uuid(),
    });

export type RegenerateDocumentSummaryDto =
    z.infer<
        typeof RegenerateDocumentSummaryDtoSchema
    >;
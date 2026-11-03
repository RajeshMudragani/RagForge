import { z } from "zod";

export const UpdateDocumentDtoSchema = z.object({
    filename: z.string().trim().min(1).max(255).optional(),
    collectionId: z.string().uuid().nullable().optional(),
}).refine(data => data.filename !== undefined || data.collectionId !== undefined, {
    message: "At least one field must be provided",
});

export type UpdateDocumentDto = z.infer<typeof UpdateDocumentDtoSchema>;

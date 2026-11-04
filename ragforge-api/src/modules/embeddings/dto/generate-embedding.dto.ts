import { z } from "zod";

export const GenerateEmbeddingDtoSchema = z.object({
    text: z.string().trim().min(1).max(32_000),
});

export type GenerateEmbeddingDto = z.infer<typeof GenerateEmbeddingDtoSchema>;

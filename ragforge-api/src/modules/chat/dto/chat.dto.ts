import { z } from "zod";
import { PromptType } from "../chat.constants.js";
import { DEFAULT_TOP_K, MAX_TOP_K } from "../../retrieval/retrieval.constants.js";

export const ChatDtoSchema = z.object({
        question: z.string()
            .trim()
            .min(1),

        topK: z.number()
            .int()
            .positive()
            .max(MAX_TOP_K)
            .default(DEFAULT_TOP_K),

        promptType: z.nativeEnum(
                PromptType,
            ).default(
                PromptType.DEFAULT,
            ),

        conversationId: z.string()
            .uuid()
            .optional(),

        collectionName: z.string()
            .trim()
            .optional(),

        metadata: z.record(z.string(), z.string()).optional(),
    });

import { z } from "zod";

export const RenameConversationDtoSchema =
    z.object({
        title: z
            .string()
            .trim()
            .min(1)
            .max(255),
    });

export type RenameConversationDto =
    z.infer<
        typeof RenameConversationDtoSchema
    >;

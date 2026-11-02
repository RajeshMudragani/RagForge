import { z } from "zod";

export const ConversationIdDtoSchema =
    z.object({
        id: z.uuid(),
    });

export type ConversationIdDto =
    z.infer<
        typeof ConversationIdDtoSchema
    >;
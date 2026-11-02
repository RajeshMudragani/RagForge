import { z } from "zod";

export const ListConversationsDtoSchema =
    z.object({
        page: z.coerce
            .number()
            .int()
            .positive()
            .default(1),

        pageSize: z.coerce
            .number()
            .int()
            .positive()
            .max(100)
            .default(20),

        search: z.string().optional(),
    });

export type ListConversationsDto =
    z.infer<
        typeof ListConversationsDtoSchema
    >;

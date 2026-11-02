import { z } from "zod";

export const CreateEvaluationDtoSchema = z.object({
    question: z.string().min(1),

    expectedAnswer:
        z.string().min(1),

    topK:
        z.number()
            .int()
            .positive()
            .default(5),
});

export type CreateEvaluationDto =
    z.infer<
        typeof CreateEvaluationDtoSchema
    >;
import { z } from "zod";

import {
    FeedbackRating,
} from "../feedback.constants.js";

export const CreateFeedbackDtoSchema =
    z.object({

        conversationId:
            z.string()
                .uuid()
                .optional(),

        question:
            z.string()
                .min(1),

        answer:
            z.string()
                .min(1),

        rating:
            z.nativeEnum(
                FeedbackRating,
            ),

        comment:
            z.string()
                .optional(),
    });

export type CreateFeedbackDto =
    z.infer<
        typeof CreateFeedbackDtoSchema
    >;
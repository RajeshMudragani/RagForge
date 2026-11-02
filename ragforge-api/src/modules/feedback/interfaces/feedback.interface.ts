import { FeedbackRating }
from "../feedback.constants.js";

export interface Feedback {
    conversationId?: string;
    question: string;
    answer: string;
    rating: FeedbackRating;
    comment?: string;
}
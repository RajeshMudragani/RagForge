import { isOrderStatusReport, requestedStatus } from "../spreadsheet-count.utils.js";

type QueryRoute =
    | "retrieval"
    | "conversational"
    | "summary"
    | "spreadsheet_count"
    | "document_summary"
    | "reject";

const GREETINGS =
    /^(hi|hello|hey|thanks|thank you|bye|goodbye|ok|okay|sure|yes|no|yep|nope)[\s!?.]*$/i;

const OFF_TOPIC =
    /^(what is the weather|tell me a joke|write a poem|generate an image|draw|paint)/i;

const QUESTION_INTENT =
    /^(what|who|where|when|why|how|which|whose|whom|is|are|was|were|do|does|did|can|could|would|should|will|explain|describe|define|tell me about)\b/i;

const SUMMARY_REQUESTS =
    /(summari[sz]e|summary|overview|key points|main topics|important points|what are these documents about|summari[sz]e my documents|summari[sz]e the collection|what topics are covered|topics covered|what.{0,30}knowledge base.{0,20}(?:cover|contain|include)|knowledge base topics)/i;

export class QueryRouterService {
    route(
        question: string,
        hasHistory: boolean,
    ): QueryRoute {

        const q = question.trim();

        if (OFF_TOPIC.test(q)) {
            return "reject";
        }

        if (GREETINGS.test(q)) {
            return "conversational";
        }

        if (isOrderStatusReport(q)) {
            return "spreadsheet_count";
        }

        if (
            /\b(?:how many|count|number of|total|cost|price|value|amount|revenue|spend)\b/i.test(q) &&
            /\borders?\b/i.test(q) &&
            requestedStatus(q)
        ) {
            return "spreadsheet_count";
        }

        if (SUMMARY_REQUESTS.test(q)) {
            return "summary";
        }

        // Route question-shaped follow-ups through retrieval and query rewriting.
        if (
            hasHistory &&
            q.length < 20 &&
            !/\?/.test(q) &&
            !QUESTION_INTENT.test(q)
        ) {
            return "conversational";
        }

        return "retrieval";
    }
}

type QueryRoute =
    | "retrieval"
    | "conversational"
    | "summary"
    | "document_summary"
    | "reject";

const GREETINGS =
    /^(hi|hello|hey|thanks|thank you|bye|goodbye|ok|okay|sure|yes|no|yep|nope)[\s!?.]*$/i;

const OFF_TOPIC =
    /^(what is the weather|tell me a joke|write a poem|generate an image|draw|paint)/i;

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

        if (SUMMARY_REQUESTS.test(q)) {
            return "summary";
        }

        // Short follow-ups with existing history don't need retrieval
        if (
            hasHistory &&
            q.length < 20 &&
            !/\?/.test(q)
        ) {
            return "conversational";
        }

        return "retrieval";
    }
}

import { LlmFactory } from "../llm/llm.factory.js";

const EXPANSION_PROMPT = (question: string) =>
    `Generate 2 alternative search queries for the following question to improve document retrieval coverage. Each query should approach the topic differently using synonyms or related terms.

Question: ${question}

Return ONLY a JSON array of 2 strings, no explanation:
["query1", "query2"]`;

export class QueryExpansionService {
    private readonly llm = LlmFactory.createWithFallback();

    async expand(question: string): Promise<string[]> {
        try {
            const response = await this.llm.generate(EXPANSION_PROMPT(question));
            // Strip markdown code fences if present (e.g. ```json\n[...]\n```)
            const cleaned = response.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
            const start = cleaned.indexOf("[");
            const end = cleaned.lastIndexOf("]");
            if (start === -1 || end === -1) return [];
            const parsed = JSON.parse(cleaned.slice(start, end + 1));
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 2);
        } catch {
            return [];
        }
    }
}

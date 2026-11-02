import { LlmFactory } from "../../llm/llm.factory.js";

const CONTEXT_PROMPT = (document: string, chunk: string) =>
    `Here is a document:\n<document>\n${document.slice(0, 2000)}\n</document>\n\nHere is a chunk from that document:\n<chunk>\n${chunk}\n</chunk>\n\nWrite a single short sentence (max 20 words) describing where this chunk fits in the document and what it is about. Output only the sentence.`;

export class ContextualEnrichmentService {
    private readonly llm = LlmFactory.createWithFallback();

    async enrich(documentText: string, chunkContent: string): Promise<string> {
        try {
            const context = await this.llm.generate(
                CONTEXT_PROMPT(documentText, chunkContent),
            );
            return `${context.trim()}\n\n${chunkContent}`;
        } catch {
            return chunkContent;
        }
    }
}

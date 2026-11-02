import { LlmFactory } from "../llm/llm.factory.js";
import { RetrievalRepository } from "../retrieval/index.js";
import { DocumentSummaryRepository } from "./document-summary.repository.js";

export class DocumentSummaryService {

    private readonly llm = LlmFactory.createWithFallback();
    private readonly repository = new DocumentSummaryRepository();
    private readonly retrievalRepository = new RetrievalRepository();

    async generateDocumentSummary(
        documentId: string,
    ) {

        const content = await this.retrievalRepository.getDocumentContent(
            documentId,
        );

        const prompt = `
            Summarise this document.

            Return valid JSON:

            {
            "summary": "",
            "shortSummary": "",
            "keyTopics": [],
            "keywords": []
            }

            DOCUMENT:

            ${content.slice(0, 30000)}
        `;

        const response = await this.llm.generate(
            prompt,
        );

        const cleaned = response.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        await this.repository.upsert(
            documentId,
            parsed.summary,
            parsed.shortSummary,
            parsed.keyTopics ?? [],
            parsed.keywords ?? [],
        );
    }

    async getDocumentSummary(
        documentId: string,
    ) {
        return this.repository.findByDocumentId(
            documentId,
        );
    }

    async getSummary(
        documentId: string,
    ) {
        return this.repository.findByDocumentId(
            documentId,
        );
    }

    async regenerateSummary(
        documentId: string,
    ) {

        await this.generateDocumentSummary(
            documentId,
        );

        return this.getSummary(
            documentId,
        );
    }

}

import { LlmFactory } from "../llm/llm.factory.js";
import { RetrievalRepository } from "../retrieval/index.js";
import { DocumentSummaryRepository } from "./document-summary.repository.js";
import { documentSummaryQueue } from "../jobs/queue/document-summary.queue.js";
import { DOCUMENT_SUMMARY_JOBS } from "../jobs/jobs/document-summary.job.js";
import { NotFoundError, BadRequestError } from "../../common/errors/index.js";

const SUMMARY_INPUT_LIMIT = 30_000;
const SUMMARY_OUTPUT_TOKEN_LIMIT = 768;

export class DocumentSummaryService {

    private readonly llm = LlmFactory.createWithFallback();
    private readonly repository = new DocumentSummaryRepository();
    private readonly retrievalRepository = new RetrievalRepository();

    async generateDocumentSummary(
        documentId: string,
    ) {
        const document = await this.repository.findDocumentOwner(documentId);
        if (!document) throw new Error(`Document ${documentId} not found`);

        await this.repository.updateDocumentSummaryStatus(documentId, "PROCESSING");

        try {
            const content = await this.retrievalRepository.getDocumentContent(documentId);
            if (!content.trim()) {
                throw new Error(`Document ${documentId} has no extracted content to summarize`);
            }

            const prompt = `
                Create a detailed, useful summary of the document. Preserve important
                explanations, conclusions, named concepts, and supporting details.
                Respond with JSON only, matching:
                {
                  "summary": "A detailed summary of about 120-180 words",
                  "shortSummary": "A concise 1-2 sentence overview",
                  "keyTopics": ["Up to 8 specific topics or concepts"],
                  "keywords": ["Up to 8 important terms"]
                }
                Keep details faithful to the source. Do not add markdown or text outside the JSON.
                DOCUMENT:
                ${this.sampleContent(content)}
            `;

            const response = await this.llm.generate(prompt, undefined, {
                maxOutputTokens: SUMMARY_OUTPUT_TOKEN_LIMIT,
            });
            const cleaned = response.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsed: unknown = JSON.parse(cleaned);

            if (
                typeof parsed !== "object" ||
                parsed === null ||
                !("summary" in parsed) ||
                typeof parsed.summary !== "string" ||
                !parsed.summary.trim() ||
                !("shortSummary" in parsed) ||
                typeof parsed.shortSummary !== "string" ||
                !("keyTopics" in parsed) ||
                !Array.isArray(parsed.keyTopics) ||
                !parsed.keyTopics.every((topic: unknown) => typeof topic === "string") ||
                !("keywords" in parsed) ||
                !Array.isArray(parsed.keywords) ||
                !parsed.keywords.every((keyword: unknown) => typeof keyword === "string")
            ) {
                throw new Error("Document summary response did not match the expected format");
            }

            await this.repository.upsert(
                documentId,
                parsed.summary,
                parsed.shortSummary,
                parsed.keyTopics,
                parsed.keywords,
            );
            await this.repository.updateDocumentSummaryStatus(documentId, "COMPLETED");
        } catch (error) {
            await this.repository.updateDocumentSummaryStatus(documentId, "FAILED");
            throw error;
        }
    }

    async getDocumentSummary(
        documentId: string,
    ) {
        return this.repository.findByDocumentId(
            documentId,
        );
    }

    async getSummariesForTenant(tenantId: string) {
        return this.repository.findAllForTenant(tenantId);
    }

    async enqueueSummary(tenantId: string, documentId: string) {
        const document = await this.repository.findDocumentOwner(documentId, tenantId);
        if (!document) throw new NotFoundError("Document");
        if (document.status !== "COMPLETED") {
            throw new BadRequestError("Document must finish processing before it can be summarized");
        }

        await this.repository.updateDocumentSummaryStatus(documentId, "PENDING");
        try {
            await documentSummaryQueue.add(
                DOCUMENT_SUMMARY_JOBS.GENERATE_DOCUMENT_SUMMARY,
                { documentId },
                { jobId: `summary-${documentId}` },
            );
        } catch (error) {
            await this.repository.updateDocumentSummaryStatus(documentId, "FAILED");
            throw error;
        }

        return { documentId, summaryStatus: "PENDING" as const };
    }

    async getSummaryForTenant(tenantId: string, documentId: string) {
        const document = await this.repository.findDocumentOwner(documentId, tenantId);
        if (!document) throw new NotFoundError("Document");
        return this.repository.findByDocumentId(documentId);
    }

    async getSummary(
        documentId: string,
    ) {
        return this.repository.findByDocumentId(
            documentId,
        );
    }

    private sampleContent(content: string): string {
        if (content.length <= SUMMARY_INPUT_LIMIT) return content;

        const excerptLength = Math.floor(SUMMARY_INPUT_LIMIT / 4);
        const lastStart = content.length - excerptLength;
        const excerpts = Array.from({ length: 4 }, (_, index) => {
            const start = Math.floor((lastStart * index) / 3);
            return content.slice(start, start + excerptLength);
        });

        return excerpts.join("\n\n[...document excerpt...]\n\n");
    }

}

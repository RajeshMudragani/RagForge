import { RetrievalService } from "../retrieval/retrieval.service.js";
import { EvaluationRepository } from "./evaluation.repository.js";
import { QueueService } from "../jobs/queue/queue.service.js";
import { LlmFactory } from "../llm/llm.factory.js";
import { FAITHFULNESS_JUDGE_PROMPT } from "./prompts/faithfulness-judge.prompt.js";

export class EvaluationService {

    private readonly retrievalService = new RetrievalService();
    private readonly repository = new EvaluationRepository();
    private readonly queueService = new QueueService();
    private readonly llm = LlmFactory.createWithFallback();

    async processEvaluation(
        question: string,
        generatedAnswer: string,
        topK: number,
        tenantId: string,
        expectedAnswer = "",
    ) {
        const chunks = await this.retrievalService.searchWithoutRerank(question, topK, tenantId);
        const context = chunks.map(c => c.content).join("\n\n");
        const retrievalPrecision = chunks.length > 0 ? 1 : 0;

        // LLM judge scoring — replaces heuristic string matching
        let faithfulness = 0.5;
        let relevance = 0.5;
        let completeness = 0.5;

        try {
            const judgeResponse = await this.llm.generate(
                FAITHFULNESS_JUDGE_PROMPT(question, context, generatedAnswer),
            );
            const start = judgeResponse.indexOf("{");
            const end = judgeResponse.lastIndexOf("}");
            if (start !== -1 && end !== -1) {
                const parsed = JSON.parse(judgeResponse.slice(start, end + 1));
                faithfulness = Number(parsed.faithfulness ?? 0.5);
                relevance = Number(parsed.relevance ?? 0.5);
                completeness = Number(parsed.completeness ?? 0.5);
            }
        } catch {
            // fall back to defaults if LLM judge fails
        }

        const overallScore = (retrievalPrecision + faithfulness + relevance + completeness) / 4;

        await this.repository.create(tenantId, {
            question,
            expectedAnswer,
            generatedAnswer,
            retrievalPrecision,
            answerRelevance: relevance,
            groundedness: faithfulness,
            overallScore,
        });

        return { retrievalPrecision, faithfulness, relevance, completeness, overallScore, generatedAnswer };
    }

    async getHistory(tenantId: string) {
        return this.repository.findAll(tenantId);
    }

    async run(question: string, expectedAnswer: string, topK: number, tenantId: string) {
        return this.queueEvaluation(question, "", topK, tenantId, expectedAnswer);
    }

    async queueEvaluation(
        question: string,
        generatedAnswer: string,
        topK: number,
        tenantId: string,
        expectedAnswer = "",
    ) {
        await this.queueService.enqueueEvaluation({ tenantId, question, expectedAnswer, topK, generatedAnswer });
        return { status: "QUEUED" };
    }
}
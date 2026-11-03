import { RetrievalService } from "../retrieval/retrieval.service.js";
import { PromptBuilderService } from "./prompt-builder.service.js";
import { ChatResponse } from "./interfaces/chat-response.interface.js";
import { PromptType } from "./chat.constants.js";
import { ConversationService } from "../conversation/index.js";
import { QueryRewriterService } from "../query-rewriter/query-rewriter.service.js";
import { QueryExpansionService } from "../query-rewriter/query-expansion.service.js";
import { QueryRouterService } from "./routing/query-router.service.js";
import { ConversationSummarizerService } from "../conversation/summarization/conversation-summarizer.service.js";
import { EvaluationService } from "../evaluation/evaluation.service.js";
import { logger } from "../../logger/logger.js";
import { LlmFactory } from "../llm/llm.factory.js";
import { DocumentSummaryRepository } from "../document-summary/document-summary.repository.js";

// Singletons — instantiated once at module load, shared across all requests
const retrievalService = new RetrievalService();
const promptBuilder = new PromptBuilderService();
const llm = LlmFactory.createWithFallback();
const conversationService = new ConversationService();
const queryRewriter = new QueryRewriterService();
const queryExpansion = new QueryExpansionService();
const queryRouter = new QueryRouterService();
const summarizer = new ConversationSummarizerService();
const evaluationService = new EvaluationService();
const documentSummaryRepository = new DocumentSummaryRepository();

const STREAM_TIMEOUT_MS = 120_000;
const NO_RELEVANT_DOCUMENTS_ANSWER =
    "I couldn't find relevant information in your processed documents. Try asking about a topic covered in your knowledge base, or check that your documents have finished processing.";

interface KnowledgeBaseSummary {
    prompt: string | null;
    answer: string;
    sources: ChatResponse["sources"];
}

export class ChatService {

    private readonly retrievalService = retrievalService;
    private readonly promptBuilder = promptBuilder;
    private readonly llm = llm;
    private readonly conversationService = conversationService;
    private readonly queryRewriter = queryRewriter;
    private readonly queryExpansion = queryExpansion;
    private readonly queryRouter = queryRouter;
    private readonly summarizer = summarizer;
    private readonly evaluationService = evaluationService;
    private readonly documentSummaryRepository = documentSummaryRepository;

    async chat(
        question: string,
        topK: number,
        promptType: PromptType,
        tenantId: string,
        conversationId?: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<ChatResponse> {

        const isNewConversation = !conversationId;

        const currentConversationId =
            await this.conversationService.ensureConversation(
                tenantId,
                conversationId,
            );

        const rawHistory =
            await this.conversationService.getHistory(
                tenantId,
                currentConversationId,
            );

        const history =
            await this.summarizer.summarizeIfNeeded(
                rawHistory,
            );

        const route =
            this.queryRouter.route(
                question,
                history.length > 0,
            );

        logger.info(
            {
                route,
                question,
            },
            "Query route",
        );

        let answer: string;

        let builtContext = {
            context: "",
            sources: [] as ChatResponse["sources"],
        };

        let rewrittenQuery = question;

        if (route === "reject") {

            answer =
                "I can only answer questions based on the provided documents. Please ask a document-related question.";

        } else if (route === "conversational") {

            const conversationalPrompt = `
                You are a helpful AI assistant.

                Respond naturally and conversationally.

                Current user message:
                ${question}
            `;

            logger.info(
                {
                    conversationalPrompt,
                },
                "Conversational prompt",
            );

            answer = await this.llm.generate(
                conversationalPrompt,
            );

        } else if (route === "summary") {
            const summary = await this.buildKnowledgeBaseSummary(
                question,
                tenantId,
                collectionName,
                metadata,
            );
            answer = summary.prompt
                ? await this.llm.generate(summary.prompt)
                : summary.answer;
            builtContext.sources = summary.sources;

        } else {

            const [rewritten, expansions] =
                await Promise.all([
                    this.queryRewriter.rewrite(
                        question,
                        history,
                    ),
                    this.queryExpansion.expand(
                        question,
                    ),
                ]);

            rewrittenQuery = rewritten;

            const allQueries = [
                rewrittenQuery,
                ...expansions,
            ];

            const allContexts =
                await Promise.all(
                    allQueries.map(q =>
                        this.retrievalService.retrieveContext(
                            q,
                            topK,
                            tenantId,
                            collectionName,
                            metadata,
                        ),
                    ),
                );

            const sourceMap =
                new Map<
                    string,
                    ChatResponse["sources"][number]
                >();

            for (const ctx of allContexts) {
                for (const s of ctx.sources) {

                    const key =
                        `${s.documentId}-${s.chunkIndex}`;

                    const existing =
                        sourceMap.get(key);

                    if (
                        !existing ||
                        (s.hybridScore ?? 0) >
                        (existing.hybridScore ?? 0)
                    ) {
                        sourceMap.set(key, s);
                    }
                }
            }

            builtContext = {
                context: allContexts[0]?.context ?? "",
                sources: Array.from(
                    sourceMap.values(),
                ).slice(0, topK),
            };

            logger.info(
                {
                    rewrittenQuery,
                    sources:
                        builtContext.sources.length,
                    contextLength:
                        builtContext.context.length,
                },
                "RAG Result",
            );

            const hasContext =
                builtContext.context.trim().length > 0 &&
                builtContext.sources.length > 0;

            if (!hasContext) {

                logger.info({ question }, "No retrieval context found");
                answer = NO_RELEVANT_DOCUMENTS_ANSWER;

            } else {

                const prompt =
                    this.promptBuilder.build(
                        question,
                        builtContext.context,
                        history,
                        promptType,
                    );

                answer =
                    await this.llm.generate(
                        prompt,
                    );
            }
        }

        await this.conversationService.addUserMessage(
            currentConversationId,
            question,
        );
        await this.conversationService.addAssistantMessage(
            currentConversationId,
            answer,
        );

        if (isNewConversation) {
            this.conversationService
                .generateAndSaveTitle(
                    tenantId,
                    currentConversationId,
                    question,
                )
                .catch(err =>
                    logger.warn(
                        { err },
                        "Failed to generate title",
                    ),
                );
        }

        this.evaluationService
            .queueEvaluation(
                question,
                answer,
                topK,
                tenantId,
            )
            .catch(err =>
                logger.warn(
                    { err },
                    "Failed to queue auto-evaluation",
                ),
            );

        return {
            answer,
            conversationId: currentConversationId,
            promptType,
            sources: builtContext.sources,
            rewrittenQuery,
        };
    }

    async streamChat(
        question: string,
        topK: number,
        promptType: PromptType,
        tenantId: string,
        onToken: (token: string) => void,
        signal?: AbortSignal,
        conversationId?: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<{
        answer: string;
        conversationId: string;
        sources: ChatResponse["sources"];
    }> {

        const isNewConversation = !conversationId;

        const currentConversationId =
            await this.conversationService.ensureConversation(
                tenantId,
                conversationId,
            );

        const rawHistory =
            await this.conversationService.getHistory(
                tenantId,
                currentConversationId,
            );

        const history =
            await this.summarizer.summarizeIfNeeded(rawHistory);

        const route =
            this.queryRouter.route(
                question,
                history.length > 0,
            );

        logger.info(
            {
                route,
                question,
            },
            "Query route",
        );

        let answer: string;
        let builtContext = {
            context: "",
            sources: [] as ChatResponse["sources"],
        };

        let rewrittenQuery = question;

        if (route === "reject") {

            answer = "I can only answer questions based on the provided documents. Please ask a document-related question.";
            onToken(answer);

        } else if (route === "conversational") {

            const conversationalPrompt = `
                You are a helpful AI assistant.

                CONVERSATION HISTORY:
                ${history
                    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
                    .join("\n")}

                USER:
                ${question}

                Respond naturally and conversationally.
                `;

                logger.info(
                    { conversationalPrompt },
                    "Conversational prompt",
                );

                answer = await this.llm.stream(
                    conversationalPrompt,
                    onToken,
                    signal,
                );
            } else if (route === "summary") {
                const summary = await this.buildKnowledgeBaseSummary(
                    question,
                    tenantId,
                    collectionName,
                    metadata,
                );
                if (summary.prompt) {
                    answer = await this.llm.stream(summary.prompt, onToken, signal);
                } else {
                    answer = summary.answer;
                    onToken(answer);
                }
                builtContext.sources = summary.sources;

            } else {

            const [rewritten, expansions] =
                await Promise.all([
                    this.queryRewriter.rewrite(
                        question,
                        history,
                    ),
                    this.queryExpansion.expand(
                        question,
                    ),
                ]);

            rewrittenQuery = rewritten;

            const allQueries = [
                rewrittenQuery,
                ...expansions,
            ];

            const allContexts = await Promise.all(
                allQueries.map(q =>
                    this.retrievalService.retrieveContext(
                        q,
                        topK,
                        tenantId,
                        collectionName,
                        metadata,
                    ),
                ),
            );

            const sourceMap =
                new Map<
                    string,
                    ChatResponse["sources"][number]
                >();

            for (const ctx of allContexts) {
                for (const s of ctx.sources) {

                    const key =
                        `${s.documentId}-${s.chunkIndex}`;

                    const existing =
                        sourceMap.get(key);

                    if (
                        !existing ||
                        (s.hybridScore ?? 0) >
                        (existing.hybridScore ?? 0)
                    ) {
                        sourceMap.set(key, s);
                    }
                }
            }

            builtContext = {
                context: allContexts[0]?.context ?? "",
                sources: Array.from(
                    sourceMap.values(),
                ).slice(0, topK),
            };

            logger.info(
                {
                    rewrittenQuery,
                    sources:
                        builtContext.sources.length,
                    contextLength:
                        builtContext.context.length,
                },
                "RAG Result",
            );

            const hasContext =
                builtContext.context.trim().length > 0 &&
                builtContext.sources.length > 0;

            if (!hasContext) {

                logger.info({ question }, "No retrieval context found");
                answer = NO_RELEVANT_DOCUMENTS_ANSWER;
                onToken(answer);

            } else {

                const prompt =
                    this.promptBuilder.build(
                        question,
                        builtContext.context,
                        history,
                        promptType,
                    );

                const streamTimeout =
                    new Promise<never>((_, reject) =>
                        setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        "Stream timeout",
                                    ),
                                ),
                            STREAM_TIMEOUT_MS,
                        ),
                    );

                answer = await Promise.race([
                    this.llm.stream(
                        prompt,
                        onToken,
                        signal,
                    ),
                    streamTimeout,
                ]);
            }
        }

        await this.conversationService.addUserMessage(
            currentConversationId,
            question,
        );
        await this.conversationService.addAssistantMessage(
            currentConversationId,
            answer,
        );

        if (isNewConversation) {
            this.conversationService
                .generateAndSaveTitle(
                    tenantId,
                    currentConversationId,
                    question,
                )
                .catch(err =>
                    logger.warn(
                        { err },
                        "Failed to generate title",
                    ),
                );
        }

        return {
            answer,
            conversationId: currentConversationId,
            sources: builtContext.sources,
        };
    }

    private async buildKnowledgeBaseSummary(
        question: string,
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<KnowledgeBaseSummary> {
        const documents = await this.documentSummaryRepository.findAllForTenant(
            tenantId,
            collectionName,
        );
        const availableSummaries = documents.filter(document => document.summary);

        if (availableSummaries.length === 0) {
            const context = await this.retrievalService.retrieveContext(
                question,
                50,
                tenantId,
                collectionName,
                metadata,
            );

            if (!context.context.trim() || context.sources.length === 0) {
                return {
                    prompt: null,
                    answer: documents.length > 0
                        ? "Your documents are still being summarized. Please try again shortly."
                        : "There are no processed documents in this knowledge base yet.",
                    sources: [],
                };
            }

            return {
                prompt: this.buildSummaryPrompt(question, context.context, false),
                answer: "",
                sources: context.sources,
            };
        }

        const summaryContext = availableSummaries.map(document => {
            const topics = document.keyTopics?.length
                ? `\nKey topics: ${document.keyTopics.join(", ")}`
                : "";
            const keywords = document.keywords?.length
                ? `\nKeywords: ${document.keywords.join(", ")}`
                : "";

            return `## ${document.filename}\n${document.shortSummary || document.summary}${topics}${keywords}`;
        }).join("\n\n");
        const documentsWithoutSummary = documents.filter(document => !document.summary);
        const unavailableNote = documentsWithoutSummary.length > 0
            ? `\n\nSummaries are not available yet for: ${documentsWithoutSummary.map(document => document.filename).join(", ")}. Mention this briefly and do not infer their contents.`
            : "";
        const sources = availableSummaries.map(document => ({
            documentId: document.documentId,
            filename: document.filename,
            chunkIndex: -1,
            similarity: 1,
        }));

        return {
            prompt: this.buildSummaryPrompt(question, `${summaryContext}${unavailableNote}`, true),
            answer: "",
            sources,
        };
    }

    private buildSummaryPrompt(question: string, context: string, perDocument: boolean): string {
        return `
            Answer the user's knowledge-base question using only the document information below.
            Do not use outside knowledge or invent details. If the information does not answer
            the question, say so clearly.

            ${perDocument
                ? "For a summary or overview, give each document its own heading and a concise summary, then finish with common themes and key topics across the knowledge base. Keep topics attributable to their source document."
                : "Summarize only the retrieved document excerpts, attribute findings to the source files, and say when excerpts are insufficient to summarize a document fully."}

            USER QUESTION:
            ${question}

            DOCUMENT INFORMATION:
            ${context}
        `;
    }
}

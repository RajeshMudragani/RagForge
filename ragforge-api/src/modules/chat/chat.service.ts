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

const STREAM_TIMEOUT_MS = 120_000;

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

            const summaryContext =
                await this.retrievalService.retrieveContext(
                    question,
                    50, // much larger context
                    tenantId,
                    collectionName,
                    metadata,
                );

            const prompt = `
                Summarise the key points, important topics, technologies,
                skills, concepts and major themes from the provided documents.

                DOCUMENT CONTENT:

                ${summaryContext.context}

                Provide:
                - Main topics
                - Key concepts
                - Important technologies
                - Notable findings
                - Short overall summary
            `;

            answer = await this.llm.generate(prompt);

            builtContext = {
                context: summaryContext.context,
                sources: summaryContext.sources,
            };

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

                logger.info(
                    { question },
                    "No retrieval context found. Falling back to model knowledge",
                );

                answer = await this.llm.generate(
                    question,
                );

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

        await Promise.all([
            this.conversationService.addUserMessage(
                currentConversationId,
                question,
            ),
            this.conversationService.addAssistantMessage(
                currentConversationId,
                answer,
            ),
        ]);

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

                const summaryContext =
                    await this.retrievalService.retrieveContext(
                        question,
                        50,
                        tenantId,
                        collectionName,
                        metadata,
                    );

                const prompt = `
                    Summarise the key points, important topics, technologies,
                    skills, concepts and major themes from the provided documents.

                    DOCUMENT CONTENT:

                    ${summaryContext.context}

                    Provide:
                    - Main topics
                    - Key concepts
                    - Important technologies
                    - Notable findings
                    - Short overall summary
                `;

                answer = await this.llm.stream(
                    prompt,
                    onToken,
                    signal,
                );

                builtContext = {
                    context: summaryContext.context,
                    sources: summaryContext.sources,
                };

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

                logger.info(
                    { question },
                    "No retrieval context found. Falling back to model knowledge",
                );

                answer = await this.llm.stream(
                    question,
                    onToken,
                    signal,
                );

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

        await Promise.all([
            this.conversationService.addUserMessage(
                currentConversationId,
                question,
            ),
            this.conversationService.addAssistantMessage(
                currentConversationId,
                answer,
            ),
        ]);

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
}

import { RetrievedChunk } from "../../retrieval/interfaces/retrieved-chunk.interface.js";
import { MAX_RERANK_CONTENT_LENGTH } from "../reranker.constants.js";

export function buildRerankPrompt(
    query: string,
    chunks: RetrievedChunk[],
): string {

    const candidates =
        chunks
            .map(
                (chunk, index) => {
                    const content = chunk.content.slice(
                        0,
                        MAX_RERANK_CONTENT_LENGTH,
                    );

                return `Candidate ${index + 1} ${content}`;
                },
            ).join("\n");

    return `
        You are an expert retrieval reranker.

        QUESTION

        ${query}

        CANDIDATES

        ${candidates}

        TASK

        You MUST score EVERY candidate.

        Return one JSON object per candidate.

        If there are 3 candidates,
        you must return exactly 3 objects.

        Example:

        [
        {
            "index": 1,
            "score": 98
        },
        {
            "index": 2,
            "score": 74
        },
        {
            "index": 3,
            "score": 21
        }
        ]

        Return scores for ALL candidates.

        Do not omit any candidate.
        Do not explain.
        Do not add markdown.
        Do not add comments.
        Do not add prose.
    `;
}
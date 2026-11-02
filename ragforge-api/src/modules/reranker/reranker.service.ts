import { RetrievedChunk } from "../retrieval/interfaces/retrieved-chunk.interface.js";
import { RerankerProvider } from "./reranker.provider.js";
import { buildRerankPrompt } from "./prompts/rerank.prompt.js";
import { RerankResult } from "./interfaces/rerank-result.interface.js";
import { MIN_RERANK_CHUNKS } from "../retrieval/retrieval.constants.js";

export class RerankerService {

    private readonly provider = new RerankerProvider();

    async rerank(
        query: string,
        chunks: RetrievedChunk[],
        topK: number,
    ): Promise<RetrievedChunk[]> {

        if (
            chunks.length < MIN_RERANK_CHUNKS
        ) {
            return chunks;
        }

        try {

            const prompt = buildRerankPrompt(
                query,
                chunks,
            );
            
            const startedAt = Date.now();
            
            const response = await this.provider.rerank(prompt);

            const rankings = this.parseResponse(response);

            if (
                rankings.length === 0
            ) {

                return chunks
                    .slice(
                        0,
                        topK,
                    );
            }

            const scoreMap =
                new Map<
                    number,
                    number
                >();

            rankings.forEach(
                ranking => {

                    scoreMap.set(
                        ranking.index,
                        ranking.score,
                    );

                },
            );

            return chunks
                .map(
                    (
                        chunk,
                        index,
                    ) => ({
                        chunk,
                        score: scoreMap.get(index + 1) ?? ((chunk.hybridScore ?? 0) * 100),

                    }),
                )
                .sort(
                    (
                        a,
                        b,
                    ) =>
                        b.score -
                        a.score,
                )
                .slice(
                    0,
                    topK,
                )
                .map(
                    item =>
                        item.chunk,
                );

        } catch (
            error
        ) {

            console.error(
                "Reranker failed",
                error,
            );

            return chunks
                .slice(
                    0,
                    topK,
                );
        }
    }

    private parseResponse(
        response: string,
    ): RerankResult[] {

        try {

            const start = response.indexOf("[");

            const end = response.lastIndexOf("]");

            if (
                start === -1 ||
                end === -1
            ) {
                return [];
            }

            const json = response.slice(start, end + 1);

            const parsed = JSON.parse(json);

            if (
                !Array.isArray(
                    parsed,
                )
            ) {
                return [];
            }

            return parsed.filter(
                item =>
                    typeof item.index === "number"
                    &&
                    typeof item.score === "number",
            );

        } catch {
            return [];
        }
    }
}
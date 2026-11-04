import { z } from "zod";
import { env } from "../../config/env.config.js";
import { logger } from "../../logger/logger.js";
import {
    EMBEDDING_MODEL,
    EXPECTED_EMBEDDING_DIMENSION,
} from "./embeddings.constants.js";
import { EmbedResponse } from "./embeddings.types.js";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 500;
const responseSchema = z.object({
    data: z.array(z.object({
        index: z.number().int().nonnegative(),
        embedding: z.array(z.number().finite()),
    })),
});

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class EmbeddingsClient {
    private async request(input: string[]): Promise<Response> {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            let response: Response;
            try {
                response = await fetch("https://openrouter.ai/api/v1/embeddings", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: EMBEDDING_MODEL,
                        input,
                        dimensions: EXPECTED_EMBEDDING_DIMENSION,
                    }),
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
            } catch (error) {
                if (attempt === MAX_ATTEMPTS) throw error;

                const delayMs = RETRY_DELAY_MS * 2 ** (attempt - 1);
                logger.warn(
                    { attempt, maxAttempts: MAX_ATTEMPTS, delayMs, err: error },
                    "OpenRouter embedding request failed; retrying",
                );
                await wait(delayMs);
                continue;
            }

            const shouldRetry = response.status === 408 || response.status === 429 || response.status >= 500;
            if (!shouldRetry || attempt === MAX_ATTEMPTS) return response;

            const delayMs = RETRY_DELAY_MS * 2 ** (attempt - 1);
            await response.body?.cancel();
            logger.warn(
                { attempt, maxAttempts: MAX_ATTEMPTS, delayMs, status: response.status },
                "OpenRouter embeddings returned a transient response; retrying",
            );
            await wait(delayMs);
        }

        throw new Error("OpenRouter embedding request exhausted retries without a response");
    }

    async embed(input: string[]): Promise<EmbedResponse> {
        if (input.length === 0) return { model: EMBEDDING_MODEL, embeddings: [] };

        const response = await this.request(input);
        if (!response.ok) {
            throw new Error(`OpenRouter embedding request failed: ${response.status}`);
        }

        const parsed = responseSchema.safeParse(await response.json());
        if (!parsed.success) {
            throw new Error("OpenRouter returned an invalid embedding response");
        }

        const sorted = [...parsed.data.data].sort((a, b) => a.index - b.index);
        if (
            sorted.length !== input.length ||
            sorted.some((item, index) => item.index !== index)
        ) {
            throw new Error("OpenRouter returned a different number or order of embeddings than requested");
        }

        if (sorted.some(item => item.embedding.length !== EXPECTED_EMBEDDING_DIMENSION)) {
            throw new Error(`OpenRouter embeddings must have ${EXPECTED_EMBEDDING_DIMENSION} dimensions`);
        }

        return {
            model: EMBEDDING_MODEL,
            embeddings: sorted.map(item => item.embedding),
        };
    }
}

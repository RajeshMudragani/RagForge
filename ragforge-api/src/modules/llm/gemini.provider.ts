import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.config.js";
import {
    ollamaRequestsTotal,
    llmLatencyMs,
} from "../metrics/metrics.registry.js";
import { LlmGenerateOptions } from "./llm.interface.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 30000;

async function withRetry<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (signal?.aborted) throw new Error("Aborted");
        try {
            return await Promise.race([
                fn(),
                new Promise<never>((_, reject) => {
                    const t = setTimeout(() => reject(new Error("Gemini request timeout")), REQUEST_TIMEOUT_MS);
                    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new Error("Aborted")); });
                }),
            ]);
        } catch (err: unknown) {
            lastError = err;
            const msg = String((err as { message?: string })?.message ?? "");
            if (msg === "Aborted") throw err;
            const isRetryable = msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("timeout");
            if (!isRetryable || attempt === MAX_RETRIES) break;
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
    }
    throw lastError;
}

export class GeminiProvider {
    private readonly ai: GoogleGenAI;

    constructor() {
        this.ai = new GoogleGenAI({
            apiKey: env.GEMINI_API_KEY,
        });
    }

    async generate(prompt: string, signal?: AbortSignal, options?: LlmGenerateOptions): Promise<string> {
        ollamaRequestsTotal.inc();
        const end = llmLatencyMs.startTimer();
        try {
            const response = await withRetry(() =>
                this.ai.models.generateContent({
                    model: env.GEMINI_MODEL,
                    contents: prompt,
                    ...(options?.maxOutputTokens || options?.responseFormat === "json"
                        ? {
                            config: {
                                ...(options.maxOutputTokens
                                    ? { maxOutputTokens: options.maxOutputTokens }
                                    : {}),
                                ...(options.responseFormat === "json"
                                    ? { responseMimeType: "application/json" }
                                    : {}),
                            },
                        }
                        : {}),
                }),
                signal,
            );
            return response.text ?? "";
        } finally {
            end();
        }
    }

    async stream(prompt: string, onToken: (token: string) => void, signal?: AbortSignal): Promise<string> {
        ollamaRequestsTotal.inc();

        const response = await withRetry(() =>
            this.ai.models.generateContentStream({
                model: env.GEMINI_MODEL,
                contents: prompt,
            }),
            signal,
        );

        let fullResponse = "";
        for await (const chunk of response) {
            if (signal?.aborted) break;
            const token = chunk.text ?? "";
            fullResponse += token;
            onToken(token);
        }
        return fullResponse;
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.generate("hello");
            return true;
        } catch {
            return false;
        }
    }
}
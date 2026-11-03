import { env } from "../../config/env.config.js";
import { GeminiProvider } from "./gemini.provider.js";
import { OllamaService } from "./ollama.provider.js";
import { logger } from "../../logger/logger.js";
import { OpenRouterProvider } from "./openrouter.provider.js";
import { LlmGenerateOptions, LlmProvider } from "./llm.interface.js";

export class LlmFactory {
    static create(): LlmProvider {
        switch (env.LLM_PROVIDER) {
            case "gemini":
                return new GeminiProvider();

            case "openrouter":
                return new OpenRouterProvider();

            default:
                return new OllamaService();
        }
    }

    static createWithFallback(): LlmProvider {
        switch (env.LLM_PROVIDER) {

            case "gemini":
                return this.createGeminiFallback();

            case "openrouter":
                return this.createOpenRouterFallback();

            default:
                return new OllamaService();
        }
    }

    private static createGeminiFallback() {
        const gemini = new GeminiProvider();
        const ollama = new OllamaService();

        return {
            generate: async (prompt: string, signal?: AbortSignal, options?: LlmGenerateOptions) => {
                try {
                    return await gemini.generate(prompt, signal, options);
                } catch (err) {
                    if ((err as Error).message === "Aborted") throw err;

                    logger.warn(
                        { err },
                        "Gemini failed, falling back to Ollama",
                    );

                    return ollama.generate(prompt, signal, options);
                }
            },

            stream: async (
                prompt: string,
                onToken: (token: string) => void,
                signal?: AbortSignal,
            ) => {
                try {
                    return await gemini.stream(
                        prompt,
                        onToken,
                        signal,
                    );
                } catch (err) {
                    if ((err as Error).message === "Aborted") throw err;

                    logger.warn(
                        { err },
                        "Gemini stream failed, falling back to Ollama",
                    );

                    return ollama.stream(
                        prompt,
                        onToken,
                        signal,
                    );
                }
            },

            healthCheck: async () => {
                try {
                    return await gemini.healthCheck();
                } catch {
                    return ollama.healthCheck();
                }
            },
        };
    }

    private static createOpenRouterFallback() {
        const openrouter = new OpenRouterProvider();
        const ollama = new OllamaService();

        return {
            generate: async (prompt: string, signal?: AbortSignal, options?: LlmGenerateOptions) => {
                try {
                    return await openrouter.generate(
                        prompt,
                        signal,
                        options,
                    );
                } catch (err) {
                    if ((err as Error).message === "Aborted") throw err;

                    logger.warn(
                        { err },
                        "OpenRouter failed, falling back to Ollama",
                    );

                    return ollama.generate(
                        prompt,
                        signal,
                        options,
                    );
                }
            },

            stream: async (
                prompt: string,
                onToken: (token: string) => void,
                signal?: AbortSignal,
            ): Promise<string> => {
                try {
                    return await openrouter.stream(
                        prompt,
                        onToken,
                        signal,
                    );
                } catch (err) {
                    if ((err as Error).message === "Aborted") throw err;

                    logger.warn(
                        { err },
                        "OpenRouter stream failed, falling back to Ollama",
                    );

                    return ollama.stream(
                        prompt,
                        onToken,
                        signal,
                    );
                }
            },

            healthCheck: async () => {
                try {
                    return await openrouter.healthCheck();
                } catch {
                    return ollama.healthCheck();
                }
            },
        };
    }

}

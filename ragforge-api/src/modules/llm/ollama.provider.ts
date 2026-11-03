import { Ollama } from "ollama";
import { env } from "../../config/env.config.js";
import { OLLAMA_LLM_MODEL } from "./llm.constants.js";
import { ollamaRequestsTotal, llmLatencyMs } from "../metrics/metrics.registry.js";
import { LlmGenerateOptions } from "./llm.interface.js";

const ollama = new Ollama({ host: env.OLLAMA_BASE_URL });

export class OllamaService {
    
    async generate(prompt: string, signal?: AbortSignal, options?: LlmGenerateOptions): Promise<string> {
        ollamaRequestsTotal.inc();

        const end = llmLatencyMs.startTimer();

        try {
            const response = await ollama.generate({
                model: OLLAMA_LLM_MODEL,
                prompt,
                stream: false,
                ...(options?.maxOutputTokens
                    ? { options: { num_predict: options.maxOutputTokens, temperature: 0.1 } }
                    : {}),
            });

            return response.response;
        } finally {
            end();
        }
    }

    async stream(prompt: string, onToken: (token: string) => void, signal?: AbortSignal): Promise<string> {
        ollamaRequestsTotal.inc();

        const stream = await ollama.generate({
            model: OLLAMA_LLM_MODEL,
            prompt,
            stream: true,
        });

        let fullResponse = "";
        for await (const chunk of stream) {
            if (signal?.aborted) break;
            const token = chunk.response ?? "";
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
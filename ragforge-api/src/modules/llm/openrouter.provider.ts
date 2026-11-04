import { env } from "../../config/env.config.js";
import { LlmGenerateOptions } from "./llm.interface.js";

export class OpenRouterProvider {
    private readonly apiKey = env.OPENROUTER_API_KEY;
    private readonly model = env.OPENROUTER_MODEL;

    async generate(
        prompt: string,
        signal?: AbortSignal,
        options?: LlmGenerateOptions,
    ): Promise<string> {
        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                signal,
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    ...(options?.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : {}),
                    ...(options?.responseFormat === "json"
                        ? { response_format: { type: "json_object" } }
                        : {}),
                }),
            },
        );

        if (!response.ok) {
            const errorBody = await response.text();

            console.error("STATUS:", response.status);
            console.error("ERROR BODY:", errorBody);

            throw new Error(
                `OpenRouter request failed: ${response.status}`,
            );
        }

        const data = await response.json();

        return (
            data.choices?.[0]?.message?.content ??
            "No response generated"
        );
    }

    async stream(
        prompt: string,
        onToken: (token: string) => void,
        signal?: AbortSignal,
    ): Promise<string> {

        let fullResponse = "";

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                signal,
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: this.model,
                    stream: true,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                }),
            },
        );

        if (!response.ok) {
            throw new Error(`OpenRouter stream request failed: ${response.status}`);
        }

        if (!response.body) {
            throw new Error("Missing response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processLine = (rawLine: string) => {
            const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
            if (!line.startsWith("data:")) return;

            const content = line.slice("data:".length).trimStart();
            if (!content || content === "[DONE]") return;

            let parsed: {
                choices?: Array<{
                    delta?: {
                        content?: unknown;
                    };
                }>;
            };
            try {
                parsed = JSON.parse(content);
            } catch {
                throw new Error("OpenRouter returned malformed streaming data.");
            }

            const token = parsed.choices?.[0]?.delta?.content;
            if (typeof token === "string" && token.length > 0) {
                fullResponse += token;
                onToken(token);
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let newline = buffer.indexOf("\n");
            while (newline !== -1) {
                processLine(buffer.slice(0, newline));
                buffer = buffer.slice(newline + 1);
                newline = buffer.indexOf("\n");
            }
        }

        buffer += decoder.decode();
        if (buffer) processLine(buffer);

        return fullResponse;
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.apiKey) return false;

            const response = await fetch("https://openrouter.ai/api/v1/key", {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
                signal: AbortSignal.timeout(10_000),
            });

            return response.ok;
        } catch {
            return false;
        }
    }
}
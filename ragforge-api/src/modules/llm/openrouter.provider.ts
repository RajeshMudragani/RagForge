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

        if (!response.body) {
            throw new Error("Missing response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value);

            const lines = chunk
                .split("\n")
                .filter((line) => line.startsWith("data:"));

            for (const line of lines) {
                const content = line.replace("data:", "").trim();

                if (content === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(content);

                    const token =
                        parsed.choices?.[0]?.delta?.content;

                    if (token) {
                        fullResponse += token;
                        onToken(token);
                    }
                } catch {
                    // ignore partial chunks
                }
            }
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
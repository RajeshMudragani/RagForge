export interface LlmGenerateOptions {
    maxOutputTokens?: number;
}

export interface LlmProvider {
    generate(
        prompt: string,
        signal?: AbortSignal,
        options?: LlmGenerateOptions,
    ): Promise<string>;

    stream(
        prompt: string,
        onToken: (token: string) => void,
        signal?: AbortSignal
    ): Promise<string>;

    healthCheck(): Promise<boolean>;
}
export interface LlmProvider {
    generate(
        prompt: string,
        signal?: AbortSignal
    ): Promise<string>;

    stream(
        prompt: string,
        onToken: (token: string) => void,
        signal?: AbortSignal
    ): Promise<string>;

    healthCheck(): Promise<boolean>;
}
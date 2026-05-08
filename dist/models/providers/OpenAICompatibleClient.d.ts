interface OpenAICompatibleClientOptions {
    baseUrl: string;
    apiKey?: string;
    timeoutMs?: number;
}
interface OpenAIChatCompleteParams {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
}
interface OpenAIEmbedParams {
    model: string;
    input: string;
}
export declare class OpenAICompatibleClient {
    private options;
    constructor(options: OpenAICompatibleClientOptions);
    chatComplete(params: OpenAIChatCompleteParams): Promise<string>;
    embed(params: OpenAIEmbedParams): Promise<number[]>;
    private buildHeaders;
}
export {};
//# sourceMappingURL=OpenAICompatibleClient.d.ts.map
interface AnthropicClientOptions {
    apiKey: string;
    timeoutMs?: number;
}
interface AnthropicChatCompleteParams {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
}
export declare class AnthropicClient {
    private options;
    constructor(options: AnthropicClientOptions);
    chatComplete(params: AnthropicChatCompleteParams): Promise<string>;
}
export {};
//# sourceMappingURL=AnthropicClient.d.ts.map
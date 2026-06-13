export class AnthropicClient {
    options;
    constructor(options) {
        this.options = options;
    }
    async chatComplete(params) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30000);
        try {
            const response = await globalThis.fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'x-api-key': this.options.apiKey
                },
                body: JSON.stringify({
                    model: params.model,
                    max_tokens: params.maxTokens ?? 512,
                    system: params.systemPrompt,
                    messages: [{ role: 'user', content: params.userPrompt }]
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                console.warn(`[cogmem] anthropic chat failed with HTTP ${response.status}`);
                return '';
            }
            const payload = await response.json();
            return payload.content?.[0]?.text ?? '';
        }
        catch (error) {
            console.warn('[cogmem] anthropic chat failed', error);
            return '';
        }
        finally {
            clearTimeout(timeout);
        }
    }
}

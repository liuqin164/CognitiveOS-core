function normalizeBaseUrl(baseUrl) {
    const trimmed = baseUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}
export class OpenAICompatibleClient {
    options;
    constructor(options) {
        this.options = options;
    }
    async chatComplete(params) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30000);
        try {
            const response = await globalThis.fetch(`${normalizeBaseUrl(this.options.baseUrl)}/chat/completions`, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify({
                    model: params.model,
                    messages: [
                        { role: 'system', content: params.systemPrompt },
                        { role: 'user', content: params.userPrompt }
                    ],
                    temperature: 0,
                    max_tokens: params.maxTokens ?? 512
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                console.warn(`[cogmem] openai_compatible chat failed with HTTP ${response.status}`);
                return '';
            }
            const payload = await response.json();
            return payload.choices?.[0]?.message?.content ?? '';
        }
        catch (error) {
            console.warn('[cogmem] openai_compatible chat failed', error);
            return '';
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async embed(params) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30000);
        try {
            const response = await globalThis.fetch(`${normalizeBaseUrl(this.options.baseUrl)}/embeddings`, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify({
                    model: params.model,
                    input: params.input
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`Embedding HTTP ${response.status}`);
            }
            const payload = await response.json();
            return payload.data?.[0]?.embedding ?? [];
        }
        finally {
            clearTimeout(timeout);
        }
    }
    buildHeaders() {
        return this.options.apiKey && this.options.apiKey.trim()
            ? {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.options.apiKey}`
            }
            : {
                'Content-Type': 'application/json'
            };
    }
}

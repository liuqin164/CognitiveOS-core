export class EmbeddingUnavailableError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'EmbeddingUnavailableError';
    }
}
export async function embedOne(provider, text) {
    const [vector] = await provider.embedBatch([text]);
    return vector;
}

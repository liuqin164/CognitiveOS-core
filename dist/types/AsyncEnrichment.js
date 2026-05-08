import { randomUUID } from 'crypto';
export class NoopAsyncEnrichmentHook {
    enrich() { }
}
export function createAsyncEnrichmentRunId() {
    return `async-enrich-${Date.now()}-${randomUUID()}`;
}

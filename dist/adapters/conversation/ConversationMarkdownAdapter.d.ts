import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class ConversationMarkdownAdapter implements SourceAdapter {
    readonly kind: "conversation_markdown";
    private readonly adapterVersion;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
    private parseMessages;
    private buildRecords;
}
//# sourceMappingURL=ConversationMarkdownAdapter.d.ts.map
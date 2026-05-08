export type NormalizationFamily = 'jsonl_transcript_export' | 'json_array_transcript_export' | 'csv_transcript_export' | 'tsv_transcript_export' | 'app_private_mixed_event_export' | 'jsonl_mixed_event_log_export';
export type NormalizedSourceFamily = 'normalized_conversation_markdown';
export interface NormalizationMetadata {
    isNormalized: boolean;
    contractVersion?: 'v1';
    normalizedSourceFamily?: NormalizedSourceFamily;
    originalInputFamily?: NormalizationFamily;
    title?: string;
    onboardingPath?: string;
}
export interface NormalizerArgs {
    input?: string;
    output?: string;
    title: string;
    format?: 'csv' | 'tsv';
}
export interface NormalizedMessage {
    role: 'user' | 'agent' | 'system' | 'narrator';
    text: string;
    timestamp: string;
}
export interface CustomNormalizerOptions<TRecord> {
    family: NormalizationFamily;
    mapRecord: (record: TRecord, index: number) => NormalizedMessage | NormalizedMessage[] | null | undefined;
}
export interface ExportBridgeMarker {
    key: string;
    value: string;
}
export interface ExportBridgeContext<TRecord, TRoot = unknown> {
    index: number;
    record: TRecord;
    root: TRoot;
    inputFamily: NormalizationFamily;
}
export interface ExportBridgeRecipe<TRecord, TRoot = unknown> {
    inputFamily: NormalizationFamily;
    selectRecords?: (input: TRoot) => TRecord[];
    isMessageCandidate?: (record: TRecord, context: ExportBridgeContext<TRecord, TRoot>) => boolean;
    mapRole: (record: TRecord, context: ExportBridgeContext<TRecord, TRoot>) => string | undefined;
    extractText: (record: TRecord, context: ExportBridgeContext<TRecord, TRoot>) => string | undefined;
    resolveTimestamp: (record: TRecord, context: ExportBridgeContext<TRecord, TRoot>) => string;
    emitMarkers?: (record: TRecord, context: ExportBridgeContext<TRecord, TRoot>) => ExportBridgeMarker[] | undefined;
}
export interface ExportBridge<TRecord, TRoot = unknown> {
    readonly inputFamily: NormalizationFamily;
    normalizeRoot: (input: TRoot) => NormalizedMessage[];
    normalizeRecords: (records: TRecord[], root?: TRoot) => NormalizedMessage[];
    collectMarkers: (records: TRecord[], root?: TRoot) => ExportBridgeMarker[];
    collectRootMarkers: (input: TRoot) => ExportBridgeMarker[];
}
export interface BridgeNormalizationResult {
    family: NormalizationFamily;
    messages: NormalizedMessage[];
    markers: ExportBridgeMarker[];
}
type LooseRecord = Record<string, unknown>;
export declare function parseNormalizerArgs(argv: string[], usage: string): NormalizerArgs;
export declare function normalizeRole(input: string | undefined): 'user' | 'agent' | 'system' | 'narrator';
export declare function pickMessageText(item: LooseRecord): string;
export declare function pickTimestamp(item: LooseRecord, fallback: number): string;
export declare function writeNormalizedConversationMarkdown(outputPath: string, title: string, family: NormalizationFamily, messages: NormalizedMessage[], markers?: ExportBridgeMarker[]): void;
export declare function normalizeJsonlRecords(inputPath: string): NormalizedMessage[];
export declare function normalizeJsonArrayRecords(inputPath: string): NormalizedMessage[];
export declare function normalizeDelimitedRecords(inputPath: string, format?: 'csv' | 'tsv'): {
    family: NormalizationFamily;
    messages: NormalizedMessage[];
};
export declare function detectNormalizationFamily(markdown: string): NormalizationFamily | undefined;
export declare function parseNormalizationMetadata(markdown: string): NormalizationMetadata;
export declare function createConversationMarkdownNormalizer<TRecord>(options: CustomNormalizerOptions<TRecord>): (records: TRecord[]) => NormalizedMessage[];
export declare function normalizeAppPrivateMixedEventRecords(inputPath: string): NormalizedMessage[];
export declare function normalizeAppPrivateMixedEventExport(inputPath: string): BridgeNormalizationResult;
export declare function normalizeJsonlMixedEventLogRecords(inputPath: string): NormalizedMessage[];
export declare function normalizeJsonlMixedEventLogExport(inputPath: string): BridgeNormalizationResult;
export declare function createExportBridge<TRecord, TRoot = TRecord[]>(recipe: ExportBridgeRecipe<TRecord, TRoot>): ExportBridge<TRecord, TRoot>;
export declare function normalizeEventExportToConversationMarkdown<TRecord, TRoot = TRecord[]>(input: TRoot, bridge: ExportBridge<TRecord, TRoot>): BridgeNormalizationResult;
export {};
//# sourceMappingURL=ConversationMarkdownNormalization.d.ts.map
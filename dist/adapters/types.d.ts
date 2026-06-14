import type { IngestInput, SourceType } from '../types/index.js';
export type SourceAdapterKind = 'conversation_markdown' | 'soul_markdown' | 'hermes_state_db' | 'openclaw_daily_memory' | 'openclaw_session' | 'openclaw_memory_index' | 'openclaw_user_profile' | 'openclaw_persona';
export type SourceRecordKind = 'conversation_message' | 'conversation_turn' | 'raw_utterance' | 'self_summary' | 'reflection' | 'note';
export type SourceReliabilityClass = 'raw_utterance' | 'self_summary' | 'reflection' | 'imported_summary' | 'imported_profile';
export type SourceActorRole = 'user' | 'agent' | 'system' | 'narrator';
export interface SourceAdapterDiagnostic {
    severity: 'info' | 'warning' | 'error';
    code: string;
    message: string;
    filePath: string;
    adapterKind: SourceAdapterKind;
    lineNumber?: number;
    contractHint?: string;
    fallbackHint?: string;
}
export interface SourceDefinition {
    sourceId: string;
    adapterKind: SourceAdapterKind;
    sourcePath: string;
    projectId?: string;
    enabled?: boolean;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface SourceFileSnapshot {
    sourceId: string;
    adapterKind: SourceAdapterKind;
    sourcePath: string;
    projectId?: string;
    fileHash: string;
    fileMtimeMs: number;
    fileSize: number;
    readAt: number;
    content: string;
}
export interface SourceProvenance {
    sourceId: string;
    sourcePath: string;
    sourceType: SourceAdapterKind;
    adapterVersion: string;
    fileHash: string;
    fileMtimeMs: number;
    recordHash: string;
    reliabilityClass: SourceReliabilityClass;
    lineStart?: number;
    lineEnd?: number;
    charStart?: number;
    charEnd?: number;
    sourceOffset?: number;
    orderingConfidence?: 'high' | 'medium' | 'low';
}
export interface SourceAdapterRecord {
    recordId: string;
    turnId?: string;
    kind: SourceRecordKind;
    role?: SourceActorRole;
    text: string;
    timestamp: number;
    tags: string[];
    confidenceHint: number;
    sourceTypeHint: SourceType;
    metadata?: Record<string, unknown>;
    provenance: SourceProvenance;
}
export interface AdaptedSource {
    source: SourceDefinition;
    snapshot: Omit<SourceFileSnapshot, 'content'>;
    records: SourceAdapterRecord[];
    diagnostics?: SourceAdapterDiagnostic[];
}
export interface AdapterWindow {
    start: number;
    end: number;
}
export interface SourceAdapter {
    readonly kind: SourceAdapterKind;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
}
export interface BatchEpisodeEnvelope {
    record: SourceAdapterRecord;
    ingestInput: IngestInput;
}
export declare function computeStableHash(parts: Array<string | number | undefined | null>): string;
export declare function inferSourceTitle(sourcePath: string): string;
export declare function normalizeMarkdownText(text: string): string;
export declare function parseLooseTimestamp(raw: string | undefined, fallback: number): number;
export interface ParsedMarkdownRoleLine {
    role: SourceActorRole;
    rawRole: string;
    text: string;
    timestamp?: string;
}
export declare function parseMarkdownRoleLine(line: string): ParsedMarkdownRoleLine | null;
export declare function parseLooseDateHeading(line: string): string | null;
export declare function resolveTimestampWithContext(raw: string | undefined, fallback: number, currentDateHint?: string): number;
export declare function buildEpisodeEnvelope(source: SourceDefinition, record: SourceAdapterRecord): BatchEpisodeEnvelope;
//# sourceMappingURL=types.d.ts.map
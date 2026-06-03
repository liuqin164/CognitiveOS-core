#!/usr/bin/env bun
import { type ExportBridgeMarker, type NormalizationFamily, type NormalizedMessageSource } from '../utils/ConversationMarkdownNormalization.js';
export interface NormalizeTranscriptCliResult {
    inputPath: string;
    outputPath: string;
    title: string;
    family: NormalizationFamily;
    dryRun: boolean;
    written: boolean;
    messageCount: number;
    sourceRefCount: number;
    sourceRefs: NormalizedMessageSource[];
    markers: ExportBridgeMarker[];
}
export declare function runNormalizeTranscript(argv: string[]): Promise<NormalizeTranscriptCliResult | void>;
//# sourceMappingURL=normalize-transcript.d.ts.map
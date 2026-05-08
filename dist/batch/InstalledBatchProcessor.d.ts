import type { IngestInput, Neuron } from '../types/index.js';
import { type SourceAdapterDiagnostic, type SourceDefinition } from '../adapters/index.js';
import type { IngestionCursorStore } from './IngestionCursorStore.js';
import type { OfflineConsolidationOutput } from '../engine/OfflineConsolidationPipeline.js';
export interface BatchConsolidationWindow {
    start: number;
    end: number;
    label: string;
}
export interface BatchConsolidationRunOptions {
    window: BatchConsolidationWindow;
    sources?: SourceDefinition[];
}
export interface BatchConsolidationSummary {
    window: BatchConsolidationWindow;
    sourcesScanned: number;
    sourcesChanged: number;
    recordsParsed: number;
    recordsIngested: number;
    skippedRecords: number;
    processedSourceIds: string[];
    adapterDiagnostics: SourceAdapterDiagnostic[];
    sourceResults: BatchSourceResult[];
    offline: OfflineConsolidationOutput;
}
export interface BatchSourceResult {
    sourceId: string;
    sourcePath: string;
    adapterKind: SourceDefinition['adapterKind'];
    recordsParsed: number;
    recordsIngested: number;
    skippedRecords: number;
    diagnostics: SourceAdapterDiagnostic[];
}
interface InstalledBatchProcessorDependencies {
    cursorStore: IngestionCursorStore;
    ingestBatch: (inputs: IngestInput[]) => Promise<Neuron[]>;
    runOfflineWindow: (window: BatchConsolidationWindow) => Promise<OfflineConsolidationOutput>;
}
export declare class InstalledBatchProcessor {
    private readonly deps;
    private readonly loader;
    private readonly adapters;
    constructor(deps: InstalledBatchProcessorDependencies);
    runOnce(options: BatchConsolidationRunOptions): Promise<BatchConsolidationSummary>;
}
export {};
//# sourceMappingURL=InstalledBatchProcessor.d.ts.map
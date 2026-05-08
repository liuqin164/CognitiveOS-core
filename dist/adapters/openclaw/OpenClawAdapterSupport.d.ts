import type { AdaptedSource, SourceAdapterKind, SourceAdapterRecord, SourceDefinition, SourceReliabilityClass } from '../types.js';
export interface OpenClawRecordDecoration {
    tags?: string[];
    metadata?: Record<string, unknown>;
    reliabilityClass?: SourceReliabilityClass;
    confidenceHint?: number;
}
export declare function decorateOpenClawRecords(adapted: AdaptedSource, source: SourceDefinition, input: {
    adapterKind: SourceAdapterKind;
    adapterVersion: string;
    baseTags: string[];
    decorateRecord?: (record: SourceAdapterRecord) => OpenClawRecordDecoration;
}): AdaptedSource;
//# sourceMappingURL=OpenClawAdapterSupport.d.ts.map
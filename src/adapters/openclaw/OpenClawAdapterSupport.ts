import type {
  AdaptedSource,
  SourceAdapterKind,
  SourceAdapterRecord,
  SourceDefinition,
  SourceReliabilityClass
} from '../types.js';

export interface OpenClawRecordDecoration {
  tags?: string[];
  metadata?: Record<string, unknown>;
  reliabilityClass?: SourceReliabilityClass;
  confidenceHint?: number;
}

export function decorateOpenClawRecords(
  adapted: AdaptedSource,
  source: SourceDefinition,
  input: {
    adapterKind: SourceAdapterKind;
    adapterVersion: string;
    baseTags: string[];
    decorateRecord?: (record: SourceAdapterRecord) => OpenClawRecordDecoration;
  }
): AdaptedSource {
  return {
    ...adapted,
    source,
    records: adapted.records.map((record) => {
      const decoration = input.decorateRecord?.(record) || {};
      const tags = Array.from(new Set([
        ...record.tags,
        ...input.baseTags,
        ...(decoration.tags || [])
      ]));

      return {
        ...record,
        tags,
        confidenceHint: decoration.confidenceHint ?? record.confidenceHint,
        metadata: {
          ...(record.metadata || {}),
          ...(decoration.metadata || {})
        },
        provenance: {
          ...record.provenance,
          sourceType: input.adapterKind,
          adapterVersion: input.adapterVersion,
          reliabilityClass: decoration.reliabilityClass ?? record.provenance.reliabilityClass
        }
      };
    })
  };
}

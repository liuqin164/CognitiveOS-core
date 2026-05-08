import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
import { SoulMarkdownAdapter } from '../soul/SoulMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';

export class OpenClawMemoryIndexAdapter implements SourceAdapter {
  readonly kind = 'openclaw_memory_index' as const;
  private readonly adapterVersion = 'openclaw-memory-index-v1';
  private readonly delegate = new SoulMarkdownAdapter();

  adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource {
    const adapted = this.delegate.adapt(source, snapshot, undefined);
    return decorateOpenClawRecords(adapted, source, {
      adapterKind: this.kind,
      adapterVersion: this.adapterVersion,
      baseTags: ['openclaw', 'source_class:memory_index', 'memory_layer:summary_seed'],
      decorateRecord: (record) => ({
        reliabilityClass: 'imported_summary',
        tags: ['provenance:imported_summary'],
        metadata: {
          openclawImportKind: 'memory_index'
        },
        confidenceHint: Math.max(record.confidenceHint, 0.68)
      })
    });
  }
}

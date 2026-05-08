import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
import { SoulMarkdownAdapter } from '../soul/SoulMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';

export class OpenClawDailyMemoryAdapter implements SourceAdapter {
  readonly kind = 'openclaw_daily_memory' as const;
  private readonly adapterVersion = 'openclaw-daily-memory-v1';
  private readonly delegate = new SoulMarkdownAdapter();

  adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource {
    const adapted = this.delegate.adapt(source, snapshot, window);
    return decorateOpenClawRecords(adapted, source, {
      adapterKind: this.kind,
      adapterVersion: this.adapterVersion,
      baseTags: ['openclaw', 'source_class:daily_memory', 'memory_layer:episodic']
    });
  }
}

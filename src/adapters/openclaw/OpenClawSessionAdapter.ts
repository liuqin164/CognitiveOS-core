import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
import { ConversationMarkdownAdapter } from '../conversation/ConversationMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';

export class OpenClawSessionAdapter implements SourceAdapter {
  readonly kind = 'openclaw_session' as const;
  private readonly adapterVersion = 'openclaw-session-v1';
  private readonly delegate = new ConversationMarkdownAdapter();

  adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource {
    const adapted = this.delegate.adapt(source, snapshot, window);
    return decorateOpenClawRecords(adapted, source, {
      adapterKind: this.kind,
      adapterVersion: this.adapterVersion,
      baseTags: ['openclaw', 'source_class:session_log', 'memory_layer:raw_evidence']
    });
  }
}

import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
import { SoulMarkdownAdapter } from '../soul/SoulMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';

export class OpenClawUserProfileAdapter implements SourceAdapter {
  readonly kind = 'openclaw_user_profile' as const;
  private readonly adapterVersion = 'openclaw-user-profile-v1';
  private readonly delegate = new SoulMarkdownAdapter();

  adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource {
    const adapted = this.delegate.adapt(source, snapshot, undefined);
    return decorateOpenClawRecords(adapted, source, {
      adapterKind: this.kind,
      adapterVersion: this.adapterVersion,
      baseTags: ['openclaw', 'source_class:user_profile', 'namespace:user_profile', 'ingest:profile_only'],
      decorateRecord: (record) => ({
        reliabilityClass: 'imported_profile',
        tags: ['profile:seed', 'profile_scope:user'],
        metadata: {
          openclawImportKind: 'user_profile',
          profileNamespace: 'user_profile'
        },
        confidenceHint: 0.84
      })
    });
  }
}

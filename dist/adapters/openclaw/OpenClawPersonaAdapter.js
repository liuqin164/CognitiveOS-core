import { SoulMarkdownAdapter } from '../soul/SoulMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';
export class OpenClawPersonaAdapter {
    kind = 'openclaw_persona';
    adapterVersion = 'openclaw-persona-v1';
    delegate = new SoulMarkdownAdapter();
    adapt(source, snapshot, window) {
        const adapted = this.delegate.adapt(source, snapshot, undefined);
        return decorateOpenClawRecords(adapted, source, {
            adapterKind: this.kind,
            adapterVersion: this.adapterVersion,
            baseTags: ['openclaw', 'source_class:persona', 'namespace:agent_persona', 'ingest:profile_only'],
            decorateRecord: () => ({
                reliabilityClass: 'imported_profile',
                tags: ['profile:seed', 'profile_scope:agent'],
                metadata: {
                    openclawImportKind: 'agent_persona',
                    profileNamespace: 'agent_persona'
                },
                confidenceHint: 0.8
            })
        });
    }
}

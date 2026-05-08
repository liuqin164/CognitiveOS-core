import { SoulMarkdownAdapter } from '../soul/SoulMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';
export class OpenClawUserProfileAdapter {
    kind = 'openclaw_user_profile';
    adapterVersion = 'openclaw-user-profile-v1';
    delegate = new SoulMarkdownAdapter();
    adapt(source, snapshot, window) {
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

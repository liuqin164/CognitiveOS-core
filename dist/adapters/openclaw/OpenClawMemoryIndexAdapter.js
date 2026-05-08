import { SoulMarkdownAdapter } from '../soul/SoulMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';
export class OpenClawMemoryIndexAdapter {
    kind = 'openclaw_memory_index';
    adapterVersion = 'openclaw-memory-index-v1';
    delegate = new SoulMarkdownAdapter();
    adapt(source, snapshot, window) {
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

import { SoulMarkdownAdapter } from '../soul/SoulMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';
export class OpenClawDailyMemoryAdapter {
    kind = 'openclaw_daily_memory';
    adapterVersion = 'openclaw-daily-memory-v1';
    delegate = new SoulMarkdownAdapter();
    adapt(source, snapshot, window) {
        const adapted = this.delegate.adapt(source, snapshot, window);
        return decorateOpenClawRecords(adapted, source, {
            adapterKind: this.kind,
            adapterVersion: this.adapterVersion,
            baseTags: ['openclaw', 'source_class:daily_memory'],
            decorateRecord: (record) => {
                if (record.provenance.reliabilityClass === 'raw_utterance') {
                    return {
                        tags: ['memory_layer:episodic']
                    };
                }
                return {
                    reliabilityClass: 'imported_summary',
                    tags: [
                        'provenance:imported_summary',
                        'governance:imported_summary_support',
                        'memory_layer:summary_seed'
                    ],
                    metadata: {
                        openclawImportKind: 'daily_memory_summary',
                        importedSummarySupport: true
                    },
                    confidenceHint: Math.min(record.confidenceHint, 0.58)
                };
            }
        });
    }
}

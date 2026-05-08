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
            baseTags: ['openclaw', 'source_class:daily_memory', 'memory_layer:episodic']
        });
    }
}

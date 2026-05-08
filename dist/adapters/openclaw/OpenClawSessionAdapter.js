import { ConversationMarkdownAdapter } from '../conversation/ConversationMarkdownAdapter.js';
import { decorateOpenClawRecords } from './OpenClawAdapterSupport.js';
export class OpenClawSessionAdapter {
    kind = 'openclaw_session';
    adapterVersion = 'openclaw-session-v1';
    delegate = new ConversationMarkdownAdapter();
    adapt(source, snapshot, window) {
        const adapted = this.delegate.adapt(source, snapshot, window);
        return decorateOpenClawRecords(adapted, source, {
            adapterKind: this.kind,
            adapterVersion: this.adapterVersion,
            baseTags: ['openclaw', 'source_class:session_log', 'memory_layer:raw_evidence']
        });
    }
}

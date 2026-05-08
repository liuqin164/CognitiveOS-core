import { detectPendingBindingPromptType, INTERACTION_EVENT_PREFIX, matchBindingReplyIntent } from '../lexicon/coreMemoryLexicon.js';
export class InteractionBinder {
    store;
    constructor(store) {
        this.store = store;
    }
    process(neuron) {
        const text = neuron.content.trim();
        const bindIntent = this.detectBindIntent(text);
        if (bindIntent) {
            const pending = this.store.getLatestPending(bindIntent.types, 10 * 60 * 1000, neuron.metadata.createdAt);
            if (!pending) {
                return {
                    bound: false,
                    pendingRegistered: false,
                    reason: 'no_pending_interaction_found'
                };
            }
            const semanticText = `${bindIntent.semanticPrefix}: ${pending.referenceText}`;
            const unit = this.store.resolvePendingWithReply({
                pendingId: pending.pendingId,
                replyNeuronId: neuron.id,
                semanticText,
                resolvedAt: neuron.metadata.createdAt
            });
            return {
                bound: true,
                pendingRegistered: false,
                unit,
                reason: 'reply_bound_to_pending_interaction'
            };
        }
        const pendingType = this.detectPendingType(text);
        if (pendingType) {
            const unit = this.store.createUnit({
                type: pendingType === 'action' ? 'proposal' : 'question',
                messageNeuronIds: [neuron.id],
                semanticText: text,
                status: 'pending',
                createdAt: neuron.metadata.createdAt
            });
            this.store.registerPending({
                bindingType: pendingType,
                unitId: unit.unitId,
                referenceText: text,
                createdAt: neuron.metadata.createdAt
            });
            return {
                bound: false,
                pendingRegistered: true,
                unit,
                reason: 'registered_pending_interaction'
            };
        }
        const unit = this.store.createUnit({
            type: text.endsWith('?') ? 'question' : 'statement',
            messageNeuronIds: [neuron.id],
            semanticText: text,
            status: 'resolved',
            createdAt: neuron.metadata.createdAt
        });
        return {
            bound: false,
            pendingRegistered: false,
            unit,
            reason: 'standalone_interaction'
        };
    }
    detectPendingType(text) {
        return detectPendingBindingPromptType(text);
    }
    detectBindIntent(text) {
        const intent = matchBindingReplyIntent(text);
        if (!intent)
            return null;
        if (intent.kind === 'approved') {
            return { types: ['action', 'question'], semanticPrefix: INTERACTION_EVENT_PREFIX.approved };
        }
        if (intent.kind === 'rejected') {
            return { types: ['action', 'question'], semanticPrefix: INTERACTION_EVENT_PREFIX.rejected };
        }
        return {
            types: ['entity'],
            semanticPrefix: `${INTERACTION_EVENT_PREFIX.entitySelection} ${intent.reference || text.trim()}`
        };
    }
}

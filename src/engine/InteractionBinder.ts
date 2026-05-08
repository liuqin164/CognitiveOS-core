import type { Neuron } from '../types/index.js';
import type { InteractionUnitRecord, InteractionUnitStore, PendingBindingType } from '../store/InteractionUnitStore.js';
import {
  detectPendingBindingPromptType,
  INTERACTION_EVENT_PREFIX,
  matchBindingReplyIntent
} from '../lexicon/coreMemoryLexicon.js';

export interface BindingResult {
  bound: boolean;
  pendingRegistered: boolean;
  unit?: InteractionUnitRecord | null;
  reason: string;
}

export class InteractionBinder {
  constructor(private store: InteractionUnitStore) {}

  process(neuron: Neuron): BindingResult {
    const text = neuron.content.trim();
    const bindIntent = this.detectBindIntent(text);
    if (bindIntent) {
      const pending = this.store.getLatestPending(
        bindIntent.types,
        10 * 60 * 1000,
        neuron.metadata.createdAt
      );
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

  private detectPendingType(text: string): PendingBindingType | null {
    return detectPendingBindingPromptType(text);
  }

  private detectBindIntent(text: string): {
    types: PendingBindingType[];
    semanticPrefix: string;
  } | null {
    const intent = matchBindingReplyIntent(text);
    if (!intent) return null;

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

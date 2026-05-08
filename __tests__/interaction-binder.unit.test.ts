import { describe, expect, it } from 'bun:test';
import { InteractionBinder } from '../src/engine/InteractionBinder.js';
import { MemoryGate } from '../src/engine/MemoryGate.js';
import { BINDING_PRIORITY, InteractionUnitStore } from '../src/store/InteractionUnitStore.js';
import type { Neuron } from '../src/types/index.js';
import { shortReplySamplesZh } from './fixtures/shortReplySamples.zh.js';
import { shortReplySamplesEn } from './fixtures/shortReplySamples.en.js';

function makeNeuron(id: string, content: string, createdAt: number): Neuron {
  return {
    id,
    content,
    prev_hash: '',
    self_hash: '',
    coordinates: { T: createdAt, S: [0, 0, 0], V: [] },
    synapses: [],
    metadata: {
      type: 'chat',
      projectId: 'binder-unit',
      createdAt
    }
  };
}

describe('InteractionBinder priority', () => {
  const bilingualCases = [
    { label: 'zh', samples: shortReplySamplesZh },
    { label: 'en', samples: shortReplySamplesEn }
  ] as const;

  for (const testCase of bilingualCases) {
    it(`keeps entity, action, and question bindings ordered by BINDING_PRIORITY under ${testCase.label} short replies`, () => {
      const store = new InteractionUnitStore(':memory:');
      const binder = new InteractionBinder(store);
      const gate = new MemoryGate();

      const generalQuestion = binder.process(makeNeuron(`n-question-${testCase.label}`, testCase.samples.priorityFlow.questionPrompt, 1_000));
      const pendingAction = binder.process(makeNeuron(`n-action-${testCase.label}`, testCase.samples.priorityFlow.actionPrompt, 2_000));
      const entityQuestion = binder.process(makeNeuron(`n-entity-${testCase.label}`, testCase.samples.priorityFlow.entityPrompt, 3_000));
      const preferredPending = store.getLatestPending(['question', 'action', 'entity'], 10 * 60 * 1000, 3_500);

      const entityReply = binder.process(makeNeuron(`n-reply-entity-${testCase.label}`, testCase.samples.priorityFlow.entityReply, 4_000));
      const actionReply = binder.process(makeNeuron(`n-reply-action-${testCase.label}`, testCase.samples.priorityFlow.actionReply, 5_000));
      const questionReply = binder.process(makeNeuron(`n-reply-question-${testCase.label}`, testCase.samples.priorityFlow.questionReply, 6_000));

      expect(BINDING_PRIORITY.entity).toBeGreaterThan(BINDING_PRIORITY.action);
      expect(BINDING_PRIORITY.action).toBeGreaterThan(BINDING_PRIORITY.question);

      expect(generalQuestion.pendingRegistered).toBe(true);
      expect(pendingAction.pendingRegistered).toBe(true);
      expect(entityQuestion.pendingRegistered).toBe(true);
      expect(preferredPending?.bindingType).toBe('entity');

      expect(gate.classify(testCase.samples.priorityFlow.entityReply).memoryClass).toBe('bind_first');
      expect(gate.classify(testCase.samples.priorityFlow.actionReply).memoryClass).toBe('bind_first');
      expect(gate.classify(testCase.samples.priorityFlow.questionReply).memoryClass).toBe('bind_first');

      expect(entityReply.bound).toBe(true);
      expect(entityReply.unit?.semanticText).toContain(testCase.samples.priorityFlow.entityPrompt);
      expect(entityReply.unit?.semanticText).not.toContain(testCase.samples.priorityFlow.actionPrompt);

      expect(actionReply.bound).toBe(true);
      expect(actionReply.unit?.semanticText).toContain(testCase.samples.priorityFlow.actionPrompt);
      expect(actionReply.unit?.semanticText).not.toContain(testCase.samples.priorityFlow.questionPrompt);

      expect(questionReply.bound).toBe(true);
      expect(questionReply.unit?.semanticText).toContain(testCase.samples.priorityFlow.questionPrompt);
      expect(questionReply.unit?.semanticText).not.toContain('user selected');

      store.close();
    });

    it(`prefers entity selection over action rejection when a ${testCase.label} reply mixes negation and relative reference`, () => {
      const store = new InteractionUnitStore(':memory:');
      const binder = new InteractionBinder(store);

      binder.process(makeNeuron(`n-action-${testCase.label}`, testCase.samples.entitySelectionOverNegation.actionPrompt, 10_000));
      binder.process(makeNeuron(`n-entity-${testCase.label}`, testCase.samples.entitySelectionOverNegation.entityPrompt, 11_000));
      const reply = binder.process(makeNeuron(`n-reply-${testCase.label}`, testCase.samples.entitySelectionOverNegation.reply, 12_000));

      expect(reply.bound).toBe(true);
      expect(reply.unit?.semanticText).toContain(testCase.samples.entitySelectionOverNegation.entityPrompt);
      expect(reply.unit?.semanticText).not.toContain(testCase.samples.entitySelectionOverNegation.actionPrompt);

      store.close();
    });

    it(`keeps later ${testCase.label} short replies bound to the latest compatible pending turn across continue/stop/select variants`, () => {
      const store = new InteractionUnitStore(':memory:');
      const binder = new InteractionBinder(store);

      binder.process(makeNeuron(`n-q1-${testCase.label}`, testCase.samples.latestCompatibleBinding.questionPrompt, 20_000));
      const keepGoing = binder.process(makeNeuron(`n-r1-${testCase.label}`, testCase.samples.latestCompatibleBinding.keepGoingReply, 20_500));

      binder.process(makeNeuron(`n-a1-${testCase.label}`, testCase.samples.latestCompatibleBinding.actionPrompt, 21_000));
      const cancelAction = binder.process(makeNeuron(`n-r2-${testCase.label}`, testCase.samples.latestCompatibleBinding.cancelReply, 21_500));

      binder.process(makeNeuron(`n-e1-${testCase.label}`, testCase.samples.latestCompatibleBinding.entityPrompt, 22_000));
      const selectLatest = binder.process(makeNeuron(`n-r3-${testCase.label}`, testCase.samples.latestCompatibleBinding.selectReply, 22_500));

      expect(keepGoing.bound).toBe(true);
      expect(keepGoing.unit?.semanticText).toContain(testCase.samples.latestCompatibleBinding.questionPrompt);

      expect(cancelAction.bound).toBe(true);
      expect(cancelAction.unit?.semanticText).toContain(testCase.samples.latestCompatibleBinding.actionPrompt);

      expect(selectLatest.bound).toBe(true);
      expect(selectLatest.unit?.semanticText).toContain(testCase.samples.latestCompatibleBinding.entityPrompt);

      store.close();
    });
  }

  it('keeps mixed-language selection replies bound to the entity prompt instead of the earlier action prompt', () => {
    const store = new InteractionUnitStore(':memory:');
    const binder = new InteractionBinder(store);

    binder.process(makeNeuron('n-action-mixed', shortReplySamplesEn.entitySelectionOverNegation.actionPrompt, 30_000));
    binder.process(makeNeuron('n-entity-mixed', shortReplySamplesZh.entitySelectionOverNegation.entityPrompt, 31_000));
    const reply = binder.process(makeNeuron('n-reply-mixed', 'this one，新的那个', 32_000));

    expect(reply.bound).toBe(true);
    expect(reply.unit?.semanticText).toContain(shortReplySamplesZh.entitySelectionOverNegation.entityPrompt);
    expect(reply.unit?.semanticText).not.toContain(shortReplySamplesEn.entitySelectionOverNegation.actionPrompt);

    store.close();
  });
});

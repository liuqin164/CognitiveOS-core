/**
 * SecondaryRecallTool.ts
 * brain_recall tool — re-runs BrainRecall with a new query.
 * Phase 48 — v1.1
 */

import type { FactRecord, EventRecord } from '../../store/FactStore.js';
import type { RecallFunction } from '../ExecutionLoop.js';

export interface SecondaryRecallInput {
  query: string;
  entityHint?: string;
  limit?: number;
  projectId?: string;
  topicPath?: string;
}

export interface SecondaryRecallOutput {
  facts: FactRecord[];
  events: EventRecord[];
  summaries?: NonNullable<import('../../types/BrainRecallResult.js').BrainRecallResult['summaries']>;
  strategy: string;
  totalHits: number;
}

export class SecondaryRecallTool {
  constructor(private readonly recallFn: RecallFunction) {}

  async execute(input: SecondaryRecallInput): Promise<SecondaryRecallOutput> {
    const limit = Math.min(input.limit ?? 6, 20); // SI-16: max 20 facts
    const result = await this.recallFn(input.query, {
      entityHint: input.entityHint,
      limit,
      projectId: input.projectId,
      topicPath: input.topicPath,
    });

    const facts = result.compiledMemory.facts.slice(0, 20); // SI-16 guard
    const events = result.compiledMemory.events.slice(0, 20);
    const summaries = (result.summaries || []).slice(0, 3);

    return {
      facts,
      events,
      summaries,
      strategy: result.strategy.primaryLevel,
      totalHits: facts.length + events.length + summaries.length,
    };
  }
}

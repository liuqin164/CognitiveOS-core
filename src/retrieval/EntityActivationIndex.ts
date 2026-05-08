import type { EntityStore } from '../store/EntityStore.js';
import type { FactStore } from '../store/FactStore.js';

export interface EntityActivationContext {
  entityIds: string[];
  factIds: string[];
  neuronIds: string[];
}

export class EntityActivationIndex {
  constructor(
    private entityStore: EntityStore,
    private factStore: FactStore
  ) {}

  activate(entityIds: string[], predicateFamilies?: string[]): EntityActivationContext {
    const facts = this.factStore.listFactsByEntityIds(entityIds, {
      predicateFamilies,
      limit: 60
    });

    return {
      entityIds,
      factIds: facts.map((fact) => fact.factId),
      neuronIds: Array.from(new Set(facts.map((fact) => fact.neuronId)))
    };
  }
}

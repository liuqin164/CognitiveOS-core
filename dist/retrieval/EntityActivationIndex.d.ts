import type { EntityStore } from '../store/EntityStore.js';
import type { FactStore } from '../store/FactStore.js';
export interface EntityActivationContext {
    entityIds: string[];
    factIds: string[];
    neuronIds: string[];
}
export declare class EntityActivationIndex {
    private entityStore;
    private factStore;
    constructor(entityStore: EntityStore, factStore: FactStore);
    activate(entityIds: string[], predicateFamilies?: string[]): EntityActivationContext;
}
//# sourceMappingURL=EntityActivationIndex.d.ts.map
/**
 * EntityExpandTool.ts
 * expand_entity tool — builds a full entity profile from facts/events/beliefs.
 * Phase 48 — v1.1
 */
import type { FactRecord, EventRecord, FactStore } from '../../store/FactStore.js';
import type { EntityStore } from '../../store/EntityStore.js';
import type { BeliefStore } from '../../belief/BeliefStore.js';
import type { BeliefRecord } from '../../types/index.js';
export interface EntityProfile {
    entityId: string;
    canonicalName: string;
    entityType: string;
    facts: FactRecord[];
    events: EventRecord[];
    beliefs: BeliefRecord[];
}
export declare class EntityExpandTool {
    private readonly factStore;
    private readonly entityStore;
    private readonly beliefStore;
    constructor(factStore: FactStore, entityStore: EntityStore, beliefStore: BeliefStore);
    execute(entityName: string, entityType?: string, projectId?: string): EntityProfile | null;
}
//# sourceMappingURL=EntityExpandTool.d.ts.map
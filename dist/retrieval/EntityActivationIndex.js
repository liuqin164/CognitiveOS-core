export class EntityActivationIndex {
    entityStore;
    factStore;
    constructor(entityStore, factStore) {
        this.entityStore = entityStore;
        this.factStore = factStore;
    }
    activate(entityIds, predicateFamilies) {
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

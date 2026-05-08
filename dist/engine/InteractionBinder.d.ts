import type { Neuron } from '../types/index.js';
import type { InteractionUnitRecord, InteractionUnitStore } from '../store/InteractionUnitStore.js';
export interface BindingResult {
    bound: boolean;
    pendingRegistered: boolean;
    unit?: InteractionUnitRecord | null;
    reason: string;
}
export declare class InteractionBinder {
    private store;
    constructor(store: InteractionUnitStore);
    process(neuron: Neuron): BindingResult;
    private detectPendingType;
    private detectBindIntent;
}
//# sourceMappingURL=InteractionBinder.d.ts.map
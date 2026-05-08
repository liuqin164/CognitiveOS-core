import type { Synapse, SynapseType } from '../types/index.js';
export declare class SynapseUtils {
    static readonly DECAY_FACTORS: Record<SynapseType, number>;
    static getDecayFactor(type: SynapseType): number;
    static create(targetId: string, type: SynapseType, weight?: number): Synapse;
    static calculateDecay(initialEnergy: number, synapseType: SynapseType, hops: number): number;
    static strengthen(synapse: Synapse, amount?: number): Synapse;
    static weaken(synapse: Synapse, amount?: number): Synapse;
}
//# sourceMappingURL=Synapse.d.ts.map
import type { Neuron, TemporalOperator, SpatialOperator } from '../types/index.js';
interface IReasoningChainStore {
    areNeuronsInSameChain(n1: string, n2: string): boolean;
}
export declare class ResonanceCore {
    private static chainStore;
    static setChainStore(store: IReasoningChainStore): void;
    /** 能量传导（含推理链强化 + 置信度乘数） */
    static propagateEnergy(anchorNeuron: Neuron, getNeuron: (id: string) => Neuron | null, maxHops?: number): Promise<Map<string, number>>;
    /** 获取衰减系数（推理链强化） */
    private static getDecayFactor;
    /** 突触类型衰减系数 */
    private static getSynapseDecay;
    private static calculateDecayedEnergy;
    /** 应用能量排序（含置信度） */
    static applyEnergyRanking(candidates: Neuron[], energyMap: Map<string, number>, temporalOp?: TemporalOperator, spatialOp?: SpatialOperator): Array<{
        neuron: Neuron;
        energy: number;
    }>;
    private static calculateTemporalEnergy;
    private static calculateSpatialEnergy;
    static calculateTotalEnergy(energyMap: Map<string, number>): number;
    static calculateResonanceDepth(energyMap: Map<string, number>): number;
}
export {};
//# sourceMappingURL=ResonanceCore.d.ts.map
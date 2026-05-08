import type { Neuron, MemoryAnchor } from '../types/index.js';
import { MemoryGraph } from './MemoryGraph.js';
export declare class Reflection {
    private memoryGraph;
    private activationLog;
    private coOccurrenceMap;
    constructor(memoryGraph: MemoryGraph);
    /** 每日权重更新 */
    dailyWeightUpdate(): Promise<void>;
    /** 动态触发：频繁激活 → 短期转长期 + 增加 stability */
    onNeuronActivated(neuronId: string): void;
    /** SM-2 遗忘曲线: CurrentWeight = BaseWeight * exp(-elapsedTime_in_days / stability) */
    private applySM2Forgetting;
    /** 检测并创建 Overrides 突触 */
    detectAndCreateOverrides(newNeuron: Neuron, vectorSearchFn?: (vector: number[], k: number) => Array<{
        id: string;
        score: number;
    }>): void;
    /** 查找冲突的旧记忆（向量检索 + 极性碰撞） */
    findConflictingNeurons(newNeuron: Neuron, vectorSearchFn?: (vector: number[], k: number) => Array<{
        id: string;
        score: number;
    }>): Neuron[];
    /** 极性碰撞检测 */
    private checkPolarityCollision;
    private findCoOccurrences;
    private recordCoOccurrence;
    private boostSynapses;
    private getSynapse;
    private updateSynapse;
    createAnchor(neuronIds: string[], projectId?: string): Promise<MemoryAnchor>;
    getActivationStats(): {
        totalActivations: number;
        activeNeurons: number;
        topActivated: {
            id: string;
            count: number;
        }[];
    };
    cleanupOldActivations(maxAge?: number): void;
}
//# sourceMappingURL=Reflection.d.ts.map
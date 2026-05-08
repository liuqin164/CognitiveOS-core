import type { Neuron } from '../types/index.js';
import { MemoryGraph } from './MemoryGraph.js';
import { EventStore } from '../store/EventStore.js';
interface IVectorStore {
    addVector(id: string, vector: number[]): void;
    removePoint(id: string): void;
    search(vector: number[], k: number): Array<{
        id: string;
        score: number;
    }>;
}
export declare class Metabolism {
    private memoryGraph;
    private vectorStore;
    private eventStore;
    private isRunning;
    private lastActivityTime;
    private silentPeriod;
    private metabolismInterval;
    private batchSize;
    constructor(memoryGraph: MemoryGraph, vectorStore?: IVectorStore, eventStore?: EventStore);
    start(): Promise<void>;
    stop(): void;
    recordActivity(): void;
    getHotMemories(): Neuron[];
    setVectorStore(vs: IVectorStore): void;
    setEventStore(es: EventStore): void;
    private runMetabolismLoop;
    /** 代谢循环 */
    private performMetabolism;
    /** 批量关联孤立神经元 */
    private batchAssociateOrphans;
    /** 批量强化（基于 repetitions） */
    private batchReinforce;
    /** 批量状态流转（SM-2 驱动） */
    private batchTransitionStates;
    private emitLifecycleEvent;
    /** SM-2 能量计算: E = exp(-days / stability) * (1 + log10(repetitions + 1)) */
    private calculateSM2Energy;
    private sleep;
}
export {};
//# sourceMappingURL=Metabolism.d.ts.map
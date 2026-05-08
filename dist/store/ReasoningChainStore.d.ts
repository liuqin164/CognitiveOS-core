import Database from 'bun:sqlite';
import type { ReasoningChain } from '../types/reasoning.js';
export declare class ReasoningChainStore {
    private db;
    constructor(db: Database);
    private initSchema;
    addChain(chain: ReasoningChain): void;
    getChain(chainId: string): ReasoningChain | null;
    getChainIdForNeuron(neuronId: string): string | null;
    areNeuronsInSameChain(neuronId1: string, neuronId2: string): boolean;
    getChainsByProject(projectId: string): ReasoningChain[];
}
//# sourceMappingURL=ReasoningChainStore.d.ts.map
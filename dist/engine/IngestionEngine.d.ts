import type { Neuron, IngestInput } from '../types/index.js';
import { Embedder } from '../store/Embedder.js';
interface IngestRuntimeOptions {
    prevNeuronSelfHash?: string | null;
}
export declare class IngestionEngine {
    private readonly vectorDimension;
    private embedder;
    private projectId?;
    private vectorSearchFn?;
    private getNeuronFn?;
    private activateNeuronFn?;
    constructor(embedder: Embedder, projectId?: string, vectorDimension?: number);
    /** 设置去重所需的依赖 */
    setDedupDeps(vectorSearchFn: (vector: number[], k: number) => Array<{
        id: string;
        score: number;
    }>, getNeuronFn: (id: string) => Neuron | null, activateNeuronFn: (id: string) => void): void;
    /** 摄取输入并创建神经元（含双重去重） */
    ingest(input: IngestInput, options?: IngestRuntimeOptions): Promise<{
        neuron: Neuron;
        isDuplicate: boolean;
        activatedId?: string;
    }>;
    /** 双重去重检查 */
    private checkDuplicate;
    /** 同步摄取（用于事务） */
    ingestSync(input: IngestInput, options?: IngestRuntimeOptions): Neuron;
    /** 批量摄取 */
    ingestBatch(inputs: IngestInput[]): Promise<Array<{
        neuron: Neuron;
        isDuplicate: boolean;
    }>>;
    /** 计算空间坐标 */
    private calculateSpatialCoordinates;
    /** 获取文件类型代码 */
    private getFileTypeCode;
    /** 计算重要性权重 */
    private calculateImportance;
    setProjectId(id: string): void;
    getProjectId(): string | undefined;
}
export {};
//# sourceMappingURL=IngestionEngine.d.ts.map
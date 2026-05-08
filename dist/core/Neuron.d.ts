import type { Neuron, NeuronMetadata, NeuronCoordinates, Synapse } from '../types/index.js';
export declare class NeuronFactory {
    /**
     * 创建新神经元
     */
    static create(content: string, prevHash: string, coordinates: NeuronCoordinates, metadata: NeuronMetadata, synapses?: Synapse[]): Neuron;
    /**
     * 验证神经元完整性
     */
    static verify(neuron: Neuron): boolean;
    /**
     * 标记神经元为可疑状态
     */
    static markSuspect(neuron: Neuron): Neuron;
    /**
     * 激活神经元（更新 lastActivated 时间戳）
     */
    static activate(neuron: Neuron): Neuron;
}
//# sourceMappingURL=Neuron.d.ts.map
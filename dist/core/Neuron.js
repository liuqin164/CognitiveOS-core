// ============================================
// 神经元类 - 核心数据结构
// ============================================
import { HashUtils } from '../utils/hash.js';
export class NeuronFactory {
    /**
     * 创建新神经元
     */
    static create(content, prevHash, coordinates, metadata, synapses = []) {
        const selfHash = HashUtils.computeSelfHash(content, coordinates.T, coordinates.S);
        return {
            id: `neuron-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content,
            prev_hash: prevHash,
            self_hash: selfHash,
            coordinates,
            synapses,
            metadata
        };
    }
    /**
     * 验证神经元完整性
     */
    static verify(neuron) {
        return HashUtils.verifyNeuronHash(neuron);
    }
    /**
     * 标记神经元为可疑状态
     */
    static markSuspect(neuron) {
        return {
            ...neuron,
            metadata: {
                ...neuron.metadata,
                status: 'suspect'
            }
        };
    }
    /**
     * 激活神经元（更新 lastActivated 时间戳）
     */
    static activate(neuron) {
        return {
            ...neuron,
            metadata: {
                ...neuron.metadata,
                lastActivated: Date.now()
            }
        };
    }
}

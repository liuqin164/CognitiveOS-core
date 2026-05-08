// ============================================
// 神经元类 - 核心数据结构
// ============================================

import type { Neuron, NeuronMetadata, NeuronCoordinates, Synapse } from '../types/index.js';
import { HashUtils } from '../utils/hash.js';

export class NeuronFactory {
  /**
   * 创建新神经元
   */
  static create(
    content: string,
    prevHash: string,
    coordinates: NeuronCoordinates,
    metadata: NeuronMetadata,
    synapses: Synapse[] = []
  ): Neuron {
    const selfHash = HashUtils.computeSelfHash(
      content,
      coordinates.T,
      coordinates.S
    );

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
  static verify(neuron: Neuron): boolean {
    return HashUtils.verifyNeuronHash(neuron);
  }

  /**
   * 标记神经元为可疑状态
   */
  static markSuspect(neuron: Neuron): Neuron {
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
  static activate(neuron: Neuron): Neuron {
    return {
      ...neuron,
      metadata: {
        ...neuron.metadata,
        lastActivated: Date.now()
      }
    };
  }
}
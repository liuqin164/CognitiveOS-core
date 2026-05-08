// ============================================
// 突触工具 - 神经元连接管理
// ============================================

import type { Synapse, SynapseType } from '../types/index.js';

export class SynapseUtils {
  static readonly DECAY_FACTORS: Record<SynapseType, number> = {
    Caused_by: 0.9,
    Sequence: 0.6,
    Similar: 0.75,
    Referenced: 0.8,
    Overrides: 0.95
  };

  static getDecayFactor(type: SynapseType): number {
    return this.DECAY_FACTORS[type] || 0.8;
  }

  static create(targetId: string, type: SynapseType, weight: number = 1.0): Synapse {
    return { targetId, type, weight: Math.min(1.0, Math.max(0.0, weight)) };
  }

  static calculateDecay(initialEnergy: number, synapseType: SynapseType, hops: number): number {
    return initialEnergy * Math.pow(this.getDecayFactor(synapseType), hops);
  }

  static strengthen(synapse: Synapse, amount: number = 0.1): Synapse {
    return { ...synapse, weight: Math.min(1.0, synapse.weight + amount) };
  }

  static weaken(synapse: Synapse, amount: number = 0.05): Synapse {
    return { ...synapse, weight: Math.max(0.0, synapse.weight - amount) };
  }
}
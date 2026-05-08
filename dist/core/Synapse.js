// ============================================
// 突触工具 - 神经元连接管理
// ============================================
export class SynapseUtils {
    static DECAY_FACTORS = {
        Caused_by: 0.9,
        Sequence: 0.6,
        Similar: 0.75,
        Referenced: 0.8,
        Overrides: 0.95
    };
    static getDecayFactor(type) {
        return this.DECAY_FACTORS[type] || 0.8;
    }
    static create(targetId, type, weight = 1.0) {
        return { targetId, type, weight: Math.min(1.0, Math.max(0.0, weight)) };
    }
    static calculateDecay(initialEnergy, synapseType, hops) {
        return initialEnergy * Math.pow(this.getDecayFactor(synapseType), hops);
    }
    static strengthen(synapse, amount = 0.1) {
        return { ...synapse, weight: Math.min(1.0, synapse.weight + amount) };
    }
    static weaken(synapse, amount = 0.05) {
        return { ...synapse, weight: Math.max(0.0, synapse.weight - amount) };
    }
}

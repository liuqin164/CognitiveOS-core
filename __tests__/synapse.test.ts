// ============================================
// 突触工具测试
// ============================================

import { describe, it, expect } from 'bun:test';
import { SynapseUtils } from '../src/core/Synapse.js';
import type { SynapseType } from '../src/types/index.js';

describe('SynapseUtils', () => {
  it('should get correct decay factors', () => {
    expect(SynapseUtils.getDecayFactor('Caused_by')).toBe(0.9);
    expect(SynapseUtils.getDecayFactor('Sequence')).toBe(0.6);
    expect(SynapseUtils.getDecayFactor('Similar')).toBe(0.75);
    expect(SynapseUtils.getDecayFactor('Referenced')).toBe(0.8);
  });

  it('should create synapse', () => {
    const synapse = SynapseUtils.create('target-id', 'Caused_by', 0.8);

    expect(synapse.targetId).toBe('target-id');
    expect(synapse.type).toBe('Caused_by');
    expect(synapse.weight).toBe(0.8);
  });

  it('should clamp weight to [0, 1]', () => {
    const synapse1 = SynapseUtils.create('target-id', 'Caused_by', 1.5);
    expect(synapse1.weight).toBe(1.0);

    const synapse2 = SynapseUtils.create('target-id', 'Caused_by', -0.5);
    expect(synapse2.weight).toBe(0.0);
  });

  it('should calculate decay', () => {
    const decay = SynapseUtils.calculateDecay(100, 'Caused_by', 2);
    expect(decay).toBeCloseTo(81, 0); // 100 * 0.9^2 = 81
  });

  it('should strengthen synapse', () => {
    const synapse = SynapseUtils.create('target-id', 'Caused_by', 0.5);
    const strengthened = SynapseUtils.strengthen(synapse, 0.2);

    expect(strengthened.weight).toBe(0.7);
  });

  it('should clamp strengthened weight to 1.0', () => {
    const synapse = SynapseUtils.create('target-id', 'Caused_by', 0.9);
    const strengthened = SynapseUtils.strengthen(synapse, 0.2);

    expect(strengthened.weight).toBe(1.0);
  });

  it('should weaken synapse', () => {
    const synapse = SynapseUtils.create('target-id', 'Caused_by', 0.5);
    const weakened = SynapseUtils.weaken(synapse, 0.1);

    expect(weakened.weight).toBe(0.4);
  });

  it('should clamp weakened weight to 0.0', () => {
    const synapse = SynapseUtils.create('target-id', 'Caused_by', 0.05);
    const weakened = SynapseUtils.weaken(synapse, 0.1);

    expect(weakened.weight).toBe(0.0);
  });
});
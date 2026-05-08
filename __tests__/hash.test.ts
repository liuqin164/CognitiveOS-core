// ============================================
// 哈希工具测试
// ============================================

import { describe, it, expect } from 'bun:test';
import { HashUtils } from '../src/utils/hash.js';

describe('HashUtils', () => {
  it('should compute SHA-256 hash', () => {
    const hash = HashUtils.sha256('test');
    expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  it('should compute self hash', () => {
    const selfHash = HashUtils.computeSelfHash('test content', 1234567890, [1, 2, 3] as [number, number, number]);
    expect(selfHash).toBeDefined();
    expect(typeof selfHash).toBe('string');
    expect(selfHash.length).toBe(64);
  });

  it('should compute prev hash for genesis', () => {
    const prevHash = HashUtils.computePrevHash(null);
    expect(prevHash).toBe('901131d838b17aac0f7885b81e03cbdc9f5157a00343d30ab22083685ed1416a');
  });

  it('should compute prev hash for non-genesis', () => {
    const prevHash = HashUtils.computePrevHash('existing-hash');
    expect(prevHash).toBe('existing-hash');
  });

  it('should verify neuron hash', () => {
    const neuron = {
      content: 'test',
      prev_hash: 'prev',
      self_hash: HashUtils.computeSelfHash('test', 1234567890, [1, 2, 3] as [number, number, number]),
      coordinates: { T: 1234567890, S: [1, 2, 3] as [number, number, number] }
    };
    expect(HashUtils.verifyNeuronHash(neuron)).toBe(true);
  });

  it('should detect invalid neuron hash', () => {
    const neuron = {
      content: 'test',
      prev_hash: 'prev',
      self_hash: 'invalid-hash',
      coordinates: { T: 1234567890, S: [1, 2, 3] as [number, number, number] }
    };
    expect(HashUtils.verifyNeuronHash(neuron)).toBe(false);
  });
});

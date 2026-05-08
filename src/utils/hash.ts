// ============================================
// 哈希工具 - 区块链风格链接
// ============================================

import { createHash } from 'crypto';

export class HashUtils {
  /**
   * 计算字符串的 SHA-256 哈希
   */
  static sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 计算神经元的 self_hash
   * 基于内容、时间坐标和空间坐标生成唯一哈希
   */
  static computeSelfHash(
    content: string,
    timestamp: number,
    spatialCoords: [number, number, number]
  ): string {
    const payload = JSON.stringify({
      content,
      T: timestamp,
      S: spatialCoords
    });
    return this.sha256(payload);
  }

  /**
   * 计算 prev_hash（区块链风格链接）
   * 新神经元的 prev_hash 指向前一个神经元的 self_hash
   */
  static computePrevHash(prevNeuronSelfHash: string | null): string {
    if (!prevNeuronSelfHash) {
      // 创世区块：使用固定前缀
      return this.sha256('GENESIS');
    }
    return prevNeuronSelfHash;
  }

  /**
   * 验证神经元的哈希完整性
   */
  static verifyNeuronHash(neuron: {
    content: string;
    prev_hash: string;
    self_hash: string;
    coordinates: { T: number; S: [number, number, number] };
  }): boolean {
    const computedSelfHash = this.computeSelfHash(
      neuron.content,
      neuron.coordinates.T,
      neuron.coordinates.S
    );
    return computedSelfHash === neuron.self_hash;
  }

  /**
   * 计算记忆锚点的摘要哈希
   */
  static computeAnchorSummary(
    neuronIds: string[],
    projectId?: string
  ): string {
    const payload = JSON.stringify({
      neuronIds: neuronIds.sort(),
      projectId,
      timestamp: Date.now()
    });
    return this.sha256(payload);
  }
}
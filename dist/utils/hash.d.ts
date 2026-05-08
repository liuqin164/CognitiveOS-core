export declare class HashUtils {
    /**
     * 计算字符串的 SHA-256 哈希
     */
    static sha256(content: string): string;
    /**
     * 计算神经元的 self_hash
     * 基于内容、时间坐标和空间坐标生成唯一哈希
     */
    static computeSelfHash(content: string, timestamp: number, spatialCoords: [number, number, number]): string;
    /**
     * 计算 prev_hash（区块链风格链接）
     * 新神经元的 prev_hash 指向前一个神经元的 self_hash
     */
    static computePrevHash(prevNeuronSelfHash: string | null): string;
    /**
     * 验证神经元的哈希完整性
     */
    static verifyNeuronHash(neuron: {
        content: string;
        prev_hash: string;
        self_hash: string;
        coordinates: {
            T: number;
            S: [number, number, number];
        };
    }): boolean;
    /**
     * 计算记忆锚点的摘要哈希
     */
    static computeAnchorSummary(neuronIds: string[], projectId?: string): string;
}
//# sourceMappingURL=hash.d.ts.map
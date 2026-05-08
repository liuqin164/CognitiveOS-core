/**
 * 序列化向量：Float32Array → Buffer
 * @param vector 浮点数组（384 维）
 * @returns Buffer（1536 字节，384 * 4）
 */
export declare function serializeVector(vector: number[]): Buffer;
/**
 * 反序列化向量：Buffer → Float32Array
 * @param blob SQLite BLOB 数据
 * @returns 浮点数组
 */
export declare function deserializeVector(blob: Buffer): number[];
/**
 * 计算向量大小（字节）
 * @param dimension 向量维度
 * @returns 字节数
 */
export declare function getVectorByteSize(dimension: number): number;
/**
 * 验证向量维度
 * @param vector 向量
 * @param expectedDimension 期望维度
 * @returns 是否匹配
 */
export declare function validateVectorDimension(vector: number[], expectedDimension: number): boolean;
//# sourceMappingURL=vector.d.ts.map
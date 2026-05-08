// ============================================
// 向量序列化工具 - Float32Array ↔ Buffer
// ============================================
/**
 * 序列化向量：Float32Array → Buffer
 * @param vector 浮点数组（384 维）
 * @returns Buffer（1536 字节，384 * 4）
 */
export function serializeVector(vector) {
    const float32Array = new Float32Array(vector);
    return Buffer.from(float32Array.buffer);
}
/**
 * 反序列化向量：Buffer → Float32Array
 * @param blob SQLite BLOB 数据
 * @returns 浮点数组
 */
export function deserializeVector(blob) {
    const float32Array = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
    return Array.from(float32Array);
}
/**
 * 计算向量大小（字节）
 * @param dimension 向量维度
 * @returns 字节数
 */
export function getVectorByteSize(dimension) {
    return dimension * 4; // Float32 = 4 bytes
}
/**
 * 验证向量维度
 * @param vector 向量
 * @param expectedDimension 期望维度
 * @returns 是否匹配
 */
export function validateVectorDimension(vector, expectedDimension) {
    return vector.length === expectedDimension;
}

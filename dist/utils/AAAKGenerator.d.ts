/**
 * AAAK 格式转换规则：
 * - | : 维度分隔符
 * - : : 属性定义
 * - > : 优选/比较
 * - → : 因果/流转
 * - () : 细节补充
 * - ★ : 权重标记
 */
export declare class AAAKGenerator {
    /**
     * 生成 AAAK 格式摘要
     * @param content 原始内容
     * @param type 神经元类型（code/chat/doc/command）
     * @param importance 重要性权重 1-5
     */
    generateSummary(content: string, type?: string, importance?: number): Promise<string>;
    /**
     * 同步生成 AAAK 格式摘要（用于事务）
     */
    generateSummarySync(content: string, type?: string, importance?: number): string;
    /**
     * 基于规则的 AAAK 压缩
     */
    private ruleBasedCompress;
    /**
     * 压缩代码类型内容
     */
    private compressCode;
    /**
     * 压缩对话类型内容
     */
    private compressChat;
    /**
     * 压缩文档类型内容
     */
    private compressDoc;
    /**
     * 压缩命令类型内容
     */
    private compressCommand;
    /**
     * 通用压缩
     */
    private compressGeneric;
    /**
     * 解析 AAAK 格式（反向操作）
     */
    parseAAAK(aaak: string): {
        entities: string[];
        decision?: string;
        cause?: string;
        importance: number;
    };
}
export declare const aaakGenerator: AAAKGenerator;
//# sourceMappingURL=AAAKGenerator.d.ts.map
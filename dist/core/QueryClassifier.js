// ============================================
// 查询分类器 - 智能路由
// ============================================
import { BrainMode } from '../types/index.js';
import { config } from '../utils/Config.js';
export class QueryClassifier {
    /**
     * 分类查询
     */
    static classify(query, options) {
        // 优先检查是否是 FUZZY 查询（自然语言）
        if (this.isFuzzyQuery(query)) {
            return {
                type: 'FUZZY',
                mode: BrainMode.FULL,
                confidence: 0.8,
                reasoning: 'Natural language query - requires LLM assistance'
            };
        }
        // 检查是否是 HARD 查询（代码片段、文件路径等）
        if (this.isHardQuery(query)) {
            return {
                type: 'HARD',
                mode: BrainMode.FULL,
                confidence: 0.9,
                reasoning: 'Contains code patterns or file paths - requires exact matching'
            };
        }
        // 默认为 STANDARD 查询
        return {
            type: 'STANDARD',
            mode: BrainMode.FULL,
            confidence: 0.7,
            reasoning: 'Standard semantic search'
        };
    }
    /**
     * 判断是否是 HARD 查询
     */
    static isHardQuery(query) {
        // 检查代码模式
        const codePatterns = [
            /function\s+\w+/,
            /class\s+\w+/,
            /import\s+.*from/,
            /export\s+(default\s+)?/,
            /const\s+\w+\s*=/,
            /let\s+\w+\s*=/,
            /=>\s*{/,
            /\.\w+\(/,
            /\/\/.*TODO/,
            /\/\/.*FIXME/
        ];
        for (const pattern of codePatterns) {
            if (pattern.test(query)) {
                return true;
            }
        }
        // 检查文件路径
        if (/\/[\w\-./]+/.test(query)) {
            return true;
        }
        // 检查特定关键词（更严格的匹配）
        const hardKeywords = [
            /\bfix\s+(the|a|an)?\s*\w+/i,
            /\bbug\s+(in|with|for)\s*/i,
            /\berror\s+(handling|message|code)/i,
            /\bexception\s+(handling|throwing)/i,
            /\bthrow\s+new\s+/i,
            /\bimplement\s+(the|a|an)?\s*\w+\s+(function|method|class)/i,
            /\brefactor\s+(the|a|an)?\s*\w+/i,
            /\boptimize\s+(the|a|an)?\s*\w+/i,
            /\bdebug\s+(the|a|an)?\s*\w+/i
        ];
        for (const keyword of hardKeywords) {
            if (keyword.test(query)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 判断是否是 FUZZY 查询
     */
    static isFuzzyQuery(query) {
        // 检查模糊时间表达
        const fuzzyTimePatterns = [
            /recent/i,
            /lately/i,
            /last\s+(week|month|year)/i,
            /a\s+few\s+(days|weeks|months)/i,
            /yesterday/i,
            /today/i
        ];
        for (const pattern of fuzzyTimePatterns) {
            if (pattern.test(query)) {
                return true;
            }
        }
        // 检查模糊空间表达
        const fuzzySpatialPatterns = [
            /nearby/i,
            /around/i,
            /close\s+to/i,
            /in\s+the\s+area/i
        ];
        for (const pattern of fuzzySpatialPatterns) {
            if (pattern.test(query)) {
                return true;
            }
        }
        // 检查自然语言特征（优先级更高）
        const naturalLanguagePatterns = [
            /what\s+(is|was|are|were)/i,
            /how\s+(do|does|did|can|could|should|would)/i,
            /why\s+(do|does|did|is|was|are|were)/i,
            /tell\s+me\s+about/i,
            /show\s+me/i,
            /find\s+(something|anything)/i,
            /explain/i,
            /describe/i,
            /help\s+me/i
        ];
        for (const pattern of naturalLanguagePatterns) {
            if (pattern.test(query)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 获取当前降级模式
     */
    static getCurrentMode() {
        const mem = process.memoryUsage().heapUsed / 1024 / 1024;
        // 如果内存超过阈值，强制进入 TEXT_ONLY 模式
        if (mem > config.degradation.memoryThresholdMB) {
            return BrainMode.TEXT_ONLY;
        }
        // 正常模式
        return BrainMode.FULL;
    }
    /**
     * 获取降级状态
     */
    static getDegradationState() {
        const mode = this.getCurrentMode();
        let trigger = 'normal';
        if (mode === 'TEXT_ONLY') {
            trigger = 'high_memory_usage';
        }
        else if (mode === 'NO_SYNAPSE') {
            trigger = 'slow_inference';
        }
        return {
            mode,
            trigger,
            timestamp: Date.now()
        };
    }
}

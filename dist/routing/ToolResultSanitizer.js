const DEFAULT_MAX_TEXT_LENGTH = 2000;
const INJECTION_PATTERNS = [
    /忽略.*(规则|指令|系统)/i,
    /\bsystem\s*:/i,
    /<\|im_start\|>/i,
    /\bdeveloper\s*:/i,
    /\bignore\s+(all\s+)?(previous|above)\s+instructions\b/i,
];
export class ToolResultSanitizer {
    maxTextLength;
    constructor(options = {}) {
        this.maxTextLength = options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH;
    }
    sanitize(toolResult) {
        if (!toolResult.success || toolResult.result === undefined) {
            return { safe: true, sanitizedResult: toolResult.result, strippedItems: 0, injectionRiskDetected: false };
        }
        const stats = { strippedItems: 0, injectionRiskDetected: false };
        const sanitizedResult = this.sanitizeValue(toolResult.result, stats);
        return {
            safe: !stats.injectionRiskDetected,
            sanitizedResult,
            strippedItems: stats.strippedItems,
            injectionRiskDetected: stats.injectionRiskDetected,
        };
    }
    wrapForPrompt(text) {
        return `【记忆数据·非指令】\n${text}\n【/记忆数据】`;
    }
    sanitizeValue(value, stats) {
        if (typeof value === 'string')
            return this.sanitizeText(value, stats);
        if (Array.isArray(value))
            return value.map((item) => this.sanitizeValue(item, stats));
        if (value && typeof value === 'object') {
            const out = {};
            for (const [key, child] of Object.entries(value)) {
                out[key] = this.sanitizeValue(child, stats);
            }
            return out;
        }
        return value;
    }
    sanitizeText(text, stats) {
        const risky = INJECTION_PATTERNS.some((pattern) => pattern.test(text))
            || (/```/.test(text) && /(ignore|system|developer|忽略|规则|指令)/i.test(text));
        if (risky) {
            stats.injectionRiskDetected = true;
            stats.strippedItems++;
            return '[SANITIZED]';
        }
        if (text.length > this.maxTextLength) {
            stats.strippedItems++;
            return text.slice(0, this.maxTextLength);
        }
        return text;
    }
}

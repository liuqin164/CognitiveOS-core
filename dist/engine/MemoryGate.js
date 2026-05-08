import { hasLongTermMemorySignal, isBindFirstShortReply } from '../lexicon/coreMemoryLexicon.js';
const DROP_PATTERNS = [
    /^(你好|您好|嗨|hi|hello)[!！。.\s]*$/i,
    /^(谢谢|thanks|thank you)[!！。.\s]*$/i,
    /^(哈哈|lol|嗯嗯|ok)[!！。.\s]*$/i
];
const SHORT_TERM_PATTERNS = [
    /^(先放一下|等会再说|先不管|稍后处理)[!！。.\s]*$/i,
    /^(hold on|later|skip for now)[!！。.\s]*$/i
];
export class MemoryGate {
    classify(text) {
        const normalized = text.trim();
        if (!normalized) {
            return { memoryClass: 'drop', confidence: 1, reason: 'empty' };
        }
        if (DROP_PATTERNS.some((pattern) => pattern.test(normalized))) {
            return { memoryClass: 'drop', confidence: 0.98, reason: 'greeting_or_noise' };
        }
        if (isBindFirstShortReply(normalized)) {
            return { memoryClass: 'bind_first', confidence: 0.94, reason: 'context_dependent_short_reply' };
        }
        if (SHORT_TERM_PATTERNS.some((pattern) => pattern.test(normalized))) {
            return { memoryClass: 'short_term', confidence: 0.88, reason: 'session_local_instruction' };
        }
        if (hasLongTermMemorySignal(normalized)) {
            return { memoryClass: 'long_term', confidence: 0.9, reason: 'contains_reusable_fact_or_event' };
        }
        if (normalized.length <= 16) {
            return { memoryClass: 'short_term', confidence: 0.68, reason: 'short_but_independent' };
        }
        return { memoryClass: 'long_term', confidence: 0.72, reason: 'default_long_term_candidate' };
    }
}

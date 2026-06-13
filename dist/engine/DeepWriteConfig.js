function parseBoolean(value, fallback = false) {
    if (value === undefined)
        return fallback;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
}
function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parseMode(value) {
    const normalized = (value || 'off').trim();
    return normalized === 'shadow'
        || normalized === 'candidate'
        || normalized === 'promote_guarded'
        || normalized === 'off'
        ? normalized
        : 'off';
}
export function resolveDeepWriteConfig(env = {}) {
    const read = (name, legacyName) => env[name] ?? (legacyName ? env[legacyName] : undefined);
    const enabled = parseBoolean(read('COGMEM_DEEP_WRITE_ENABLED', 'AGENT_BRAIN_DEEP_WRITE_ENABLED'), false);
    const mode = enabled
        ? parseMode(read('COGMEM_DEEP_WRITE_MODE', 'AGENT_BRAIN_DEEP_WRITE_MODE') || 'shadow')
        : 'off';
    return {
        enabled,
        mode,
        contextTurns: Math.min(100, Math.floor(parseNumber(read('COGMEM_DEEP_WRITE_CONTEXT_TURNS', 'AGENT_BRAIN_DEEP_WRITE_CONTEXT_TURNS'), 24))),
        recallLimit: Math.min(50, Math.floor(parseNumber(read('COGMEM_DEEP_WRITE_RECALL_LIMIT', 'AGENT_BRAIN_DEEP_WRITE_RECALL_LIMIT'), 12))),
        minPromoteConfidence: Math.min(1, Math.max(0, parseNumber(read('COGMEM_DEEP_WRITE_MIN_PROMOTE_CONFIDENCE', 'AGENT_BRAIN_DEEP_WRITE_MIN_PROMOTE_CONFIDENCE'), 0.86))),
        modelRole: 'memory',
        allowCloud: parseBoolean(read('COGMEM_DEEP_WRITE_ALLOW_CLOUD', 'AGENT_BRAIN_DEEP_WRITE_ALLOW_CLOUD'), false),
        redactionEnabled: parseBoolean(read('COGMEM_DEEP_WRITE_REDACTION_ENABLED', 'AGENT_BRAIN_DEEP_WRITE_REDACTION_ENABLED'), true),
        promoteCausalLinks: parseBoolean(read('COGMEM_DEEP_WRITE_PROMOTE_CAUSAL', 'AGENT_BRAIN_DEEP_WRITE_PROMOTE_CAUSAL'), false)
    };
}

const SECRET_PATTERNS = [
    [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/g, 'Bearer [REDACTED]'],
    [/\bsk-[A-Za-z0-9_-]{16,}\b/g, 'sk-[REDACTED]'],
    [/\b[A-Za-z0-9_]*API[_-]?KEY[A-Za-z0-9_]*\s*[:=]\s*["']?[^"'\s,;]+/gi, 'API_KEY=[REDACTED]'],
    [/\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s,;]+/gi, '$1=[REDACTED]'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]']
];
function redactString(input) {
    let value = input;
    let count = 0;
    for (const [pattern, replacement] of SECRET_PATTERNS) {
        value = value.replace(pattern, (match) => {
            count += 1;
            return typeof replacement === 'string' && replacement.includes('$1')
                ? match.replace(pattern, replacement)
                : replacement;
        });
    }
    return { value, count };
}
function redactValue(value) {
    if (typeof value === 'string')
        return redactString(value);
    if (Array.isArray(value)) {
        let count = 0;
        const redacted = value.map((item) => {
            const result = redactValue(item);
            count += result.count;
            return result.value;
        });
        return { value: redacted, count };
    }
    if (value && typeof value === 'object') {
        let count = 0;
        const redacted = {};
        for (const [key, child] of Object.entries(value)) {
            const result = redactValue(child);
            count += result.count;
            redacted[key] = result.value;
        }
        return { value: redacted, count };
    }
    return { value, count: 0 };
}
export class DeepWriteRedactor {
    redact(input) {
        const result = redactValue(input);
        return {
            value: result.value,
            redactionCount: result.count
        };
    }
}

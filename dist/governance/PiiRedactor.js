export class PiiRedactor {
    policy;
    constructor(policy = {}) {
        this.policy = policy;
    }
    redact(input) {
        const enabled = {
            email: this.policy.email !== false,
            phone: this.policy.phone !== false,
            ssn: this.policy.ssn !== false,
        };
        let text = input;
        const findings = [];
        if (enabled.email) {
            text = this.replace(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 'email', '[REDACTED_EMAIL]', findings);
        }
        if (enabled.phone) {
            // Chinese mainland mobile: optional +86 prefix, 1[3-9]x xxxxxxxx
            text = this.replace(text, /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}(?!\d)/g, 'phone', '[REDACTED_PHONE]', findings);
            // North-American NANP: +1 / 1 optional, (NXX) NXX-XXXX or NXX-NXX-XXXX
            // Note: N = 2-9, X = 0-9
            text = this.replace(text, /(?<!\d)(?:\+?1[-.\s]?)?\(?\b[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b(?!\d)/g, 'phone', '[REDACTED_PHONE]', findings);
            // International E.164 fallback: +CC followed by 6-14 digits (catches most other countries)
            text = this.replace(text, /\+(?!86\b|1\b)[1-9]\d{0,2}[-\s]?\d{4,14}(?!\d)/g, 'phone', '[REDACTED_PHONE]', findings);
        }
        if (enabled.ssn) {
            text = this.replace(text, /\b\d{3}-\d{2}-\d{4}\b/g, 'ssn', '[REDACTED_SSN]', findings);
        }
        return { text, findings };
    }
    replace(input, pattern, type, replacement, findings) {
        return input.replace(pattern, (value) => {
            findings.push({ type, value });
            return replacement;
        });
    }
}

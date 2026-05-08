export interface PiiFinding {
    type: 'email' | 'phone' | 'ssn';
    value: string;
}
export interface RedactionPolicy {
    email?: boolean;
    phone?: boolean;
    ssn?: boolean;
}
export interface RedactionResult {
    text: string;
    findings: PiiFinding[];
}
export declare class PiiRedactor {
    private readonly policy;
    constructor(policy?: RedactionPolicy);
    redact(input: string): RedactionResult;
    private replace;
}
//# sourceMappingURL=PiiRedactor.d.ts.map
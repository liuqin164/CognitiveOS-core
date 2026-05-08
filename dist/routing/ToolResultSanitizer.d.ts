import type { BrainToolResult } from './LLMToolSchema.js';
export interface SanitizationResult {
    safe: boolean;
    sanitizedResult: unknown;
    strippedItems: number;
    injectionRiskDetected: boolean;
}
export interface ToolResultSanitizerOptions {
    maxTextLength?: number;
}
export declare class ToolResultSanitizer {
    private readonly maxTextLength;
    constructor(options?: ToolResultSanitizerOptions);
    sanitize(toolResult: BrainToolResult): SanitizationResult;
    wrapForPrompt(text: string): string;
    private sanitizeValue;
    private sanitizeText;
}
//# sourceMappingURL=ToolResultSanitizer.d.ts.map
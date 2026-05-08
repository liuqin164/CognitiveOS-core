import type { BrainToolCall, BrainToolResult } from './LLMToolSchema.js';
import { type ToolEvidenceItem } from './ToolEvidencePack.js';
export interface ToolEvidenceNormalizeInput {
    toolResult: BrainToolResult;
    call: BrainToolCall;
    sanitizedResult: unknown;
    projectId?: string;
    injectionRiskDetected?: boolean;
}
export declare class ToolEvidenceNormalizer {
    normalize(input: ToolEvidenceNormalizeInput): ToolEvidenceItem;
}
//# sourceMappingURL=ToolEvidenceNormalizer.d.ts.map
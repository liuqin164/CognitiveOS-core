/**
 * ToolCallParser.ts
 * Parses LLM output to extract BrainToolCall JSON objects or detect final answers.
 * Phase 46 — v1.1 ReAct
 */
import type { BrainToolCall } from './LLMToolSchema.js';
/**
 * Parse the LLM output and return a BrainToolCall if the response is a
 * tool invocation, or `null` if it is a final natural-language answer.
 */
export declare function parse(llmOutput: string): BrainToolCall | null;
/**
 * Returns true when the LLM output is a final answer (no tool call detected).
 */
export declare function isFinalAnswer(llmOutput: string): boolean;
//# sourceMappingURL=ToolCallParser.d.ts.map
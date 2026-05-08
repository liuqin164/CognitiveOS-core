/**
 * LLMToolSchema.ts
 * Defines the tool contracts that LLMs can invoke during iterative clarification.
 * Phase 46 — v1.1 ReAct (LLM-as-active-memory-retriever)
 */
export type BrainToolName = 'brain_recall' | 'get_neuron_context' | 'expand_entity' | 'find_file_assets' | 'get_file_context' | 'find_skills';
/** A single tool-call JSON emitted by the LLM inside its response. */
export interface BrainToolCall {
    action: BrainToolName;
    /** brain_recall */
    query?: string;
    /** brain_recall, expand_entity */
    entity_hint?: string;
    /** brain_recall */
    limit?: number;
    /** get_neuron_context */
    neuron_id?: string;
    /** expand_entity */
    entity_name?: string;
    /** expand_entity */
    entity_type?: string;
    /** find_file_assets */
    extension?: string;
    /** find_file_assets */
    mime_type?: string;
    /** get_file_context */
    asset_id?: string;
    /** get_file_context */
    chunk_index?: number;
    /** get_file_context */
    radius?: number;
    /** All tools — LLM's explanation of why it is calling the tool */
    reason?: string;
}
/** Result returned by the dispatcher after executing a BrainToolCall. */
export interface BrainToolResult {
    toolName: BrainToolName;
    callId: string;
    success: boolean;
    /** Structured or text payload the LLM will see in the next iteration. */
    result?: unknown;
    errorMessage?: string;
    durationMs: number;
}
interface ToolParamDef {
    name: string;
    type: string;
    required: boolean;
    description: string;
}
export interface BrainToolSchema {
    name: BrainToolName;
    description: string;
    params: ToolParamDef[];
}
export declare const BRAIN_TOOL_SCHEMAS: BrainToolSchema[];
export declare function getRequiredParams(action: BrainToolName): string[];
export declare function buildToolSchemaBlock(): string;
export {};
//# sourceMappingURL=LLMToolSchema.d.ts.map
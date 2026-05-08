/**
 * ToolCallParser.ts
 * Parses LLM output to extract BrainToolCall JSON objects or detect final answers.
 * Phase 46 — v1.1 ReAct
 */
import { getRequiredParams } from './LLMToolSchema.js';
const ALLOWED_ACTIONS = new Set([
    'brain_recall',
    'get_neuron_context',
    'expand_entity',
    'find_file_assets',
    'get_file_context',
]);
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Attempts to extract the first JSON object from an arbitrary string.
 * The LLM may prefix its call with explanatory text, e.g.:
 *   "I need more details.\n{\"action\":\"brain_recall\",...}"
 *
 * Strategy: scan for the first '{' that starts a valid JSON object.
 */
function extractFirstJsonObject(text) {
    let depth = 0;
    let start = -1;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '{') {
            if (depth === 0)
                start = i;
            depth++;
        }
        else if (ch === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                const candidate = text.slice(start, i + 1);
                try {
                    const parsed = JSON.parse(candidate);
                    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        return parsed;
                    }
                }
                catch {
                    // not valid JSON, continue scanning
                    depth = 0;
                    start = -1;
                }
            }
        }
    }
    return null;
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Parse the LLM output and return a BrainToolCall if the response is a
 * tool invocation, or `null` if it is a final natural-language answer.
 */
export function parse(llmOutput) {
    if (!llmOutput || typeof llmOutput !== 'string')
        return null;
    const trimmed = llmOutput.trim();
    if (trimmed.startsWith('[')) {
        try {
            if (Array.isArray(JSON.parse(trimmed)))
                return null;
        }
        catch {
            // Fall through to object extraction for malformed text with later JSON.
        }
    }
    const obj = extractFirstJsonObject(llmOutput);
    if (obj === null)
        return null;
    const action = obj['action'];
    if (typeof action !== 'string')
        return null;
    if (!ALLOWED_ACTIONS.has(action))
        return null;
    const toolName = action;
    // Validate required parameters
    const required = getRequiredParams(toolName);
    for (const param of required) {
        if (obj[param] === undefined || obj[param] === null || obj[param] === '') {
            return null; // missing required field → treat as final answer
        }
    }
    // Build the typed BrainToolCall
    const call = { action: toolName };
    if (typeof obj['query'] === 'string')
        call.query = obj['query'];
    if (typeof obj['entity_hint'] === 'string')
        call.entity_hint = obj['entity_hint'];
    if (typeof obj['limit'] === 'number')
        call.limit = obj['limit'];
    if (typeof obj['neuron_id'] === 'string')
        call.neuron_id = obj['neuron_id'];
    if (typeof obj['entity_name'] === 'string')
        call.entity_name = obj['entity_name'];
    if (typeof obj['entity_type'] === 'string')
        call.entity_type = obj['entity_type'];
    if (typeof obj['extension'] === 'string')
        call.extension = obj['extension'];
    if (typeof obj['mime_type'] === 'string')
        call.mime_type = obj['mime_type'];
    if (typeof obj['asset_id'] === 'string')
        call.asset_id = obj['asset_id'];
    if (typeof obj['chunk_index'] === 'number')
        call.chunk_index = obj['chunk_index'];
    if (typeof obj['radius'] === 'number')
        call.radius = obj['radius'];
    if (typeof obj['reason'] === 'string')
        call.reason = obj['reason'];
    return call;
}
/**
 * Returns true when the LLM output is a final answer (no tool call detected).
 */
export function isFinalAnswer(llmOutput) {
    return parse(llmOutput) === null;
}

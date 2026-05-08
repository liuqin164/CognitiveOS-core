function truncate(value, maxLength) {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
function stripJsonFence(raw) {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced?.[1]?.trim() || trimmed;
}
export class DeepWriteMemoryCompiler {
    generate;
    constructor(generate) {
        this.generate = generate;
    }
    async compile(input) {
        const systemPrompt = [
            'You are the write-time memory compiler for Agent Brain.',
            'Return JSON only.',
            'Do not invent facts.',
            'Every candidate must include evidence.',
            'Distinguish explicit user statements from assistant claims and model inference.',
            'Treat metaphors, emotions, and causal links as interpretations unless directly stated.',
            'Do not store small talk as long-term memory unless it reveals a durable preference, goal, constraint, relationship, plan, or state.',
            'Use these top-level arrays when applicable: summary, entities, facts, relations, causalLinks, preferences, emotionalSignals, metaphorInterpretations, contradictions, unresolvedQuestions.',
            'Each item should include confidence, evidence, source, durability, and risk.'
        ].join('\n');
        const userPrompt = truncate(JSON.stringify({
            projectId: input.projectId,
            sessionId: input.sessionId,
            currentExchange: input.currentExchange,
            recentTurns: input.recentTurns,
            recalledMemory: input.recalledMemory
        }, null, 2), 24000);
        const rawOutput = await this.generate(systemPrompt, userPrompt);
        const parsed = JSON.parse(stripJsonFence(rawOutput || '{}'));
        return {
            output: parsed && typeof parsed === 'object' ? parsed : {},
            rawOutput,
            systemPrompt,
            userPrompt
        };
    }
}

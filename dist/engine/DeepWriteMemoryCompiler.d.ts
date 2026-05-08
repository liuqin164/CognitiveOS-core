import type { TextGenerateFn } from '../models/ModelRole.js';
export interface DeepWriteTurnInput {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    turnId?: string;
}
export interface DeepWriteRecallInput {
    facts: unknown[];
    beliefs: unknown[];
    entities: unknown[];
    rawEvidence: Array<{
        neuronId: string;
        content: string;
        createdAt: number;
        tags?: string[];
    }>;
}
export interface DeepWriteMemoryCompilerInput {
    projectId?: string;
    sessionId?: string;
    currentExchange: {
        userTurnId?: string;
        assistantTurnId?: string;
        userText: string;
        assistantText?: string;
        createdAt: number;
    };
    recentTurns: DeepWriteTurnInput[];
    recalledMemory: DeepWriteRecallInput;
}
export interface DeepWriteMemoryCompilerResult {
    output: Record<string, unknown>;
    rawOutput: string;
    systemPrompt: string;
    userPrompt: string;
}
export declare class DeepWriteMemoryCompiler {
    private readonly generate;
    constructor(generate: TextGenerateFn);
    compile(input: DeepWriteMemoryCompilerInput): Promise<DeepWriteMemoryCompilerResult>;
}
//# sourceMappingURL=DeepWriteMemoryCompiler.d.ts.map
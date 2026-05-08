import type { BrainRecallResult } from '../types/BrainRecallResult.js';
import type { IngestInput } from '../types/index.js';
export interface LongMemEvalQuestion {
    id: string;
    query: string;
    expectedAnswer: string;
    type: 'single_hop' | 'multi_hop' | 'temporal' | 'negative' | string;
}
export interface LongMemEvalSession {
    id: string;
    projectId?: string;
    messages: Array<{
        role: 'user' | 'assistant' | string;
        content: string;
    }>;
    questions: LongMemEvalQuestion[];
}
export interface LongMemEvalDataset {
    sessions: LongMemEvalSession[];
}
export interface LongMemEvalMetrics {
    totalQuestions: number;
    correct: number;
    accuracy: number;
    accuracyByType: Record<string, number>;
    avgRecallMs: number;
}
export interface LongMemEvalBrain {
    ingest(input: IngestInput): Promise<unknown>;
    recall(query: string, options?: {
        projectId?: string;
        limit?: number;
        includeRawEvidence?: boolean;
    }): BrainRecallResult;
}
export declare class LongMemEvalAdapter {
    private readonly brain;
    constructor(brain: LongMemEvalBrain);
    runDataset(datasetPath: string): Promise<LongMemEvalMetrics>;
    private runSession;
    private toMetrics;
    private renderRecallAnswer;
    private evaluateAnswer;
    private answerTokens;
}
//# sourceMappingURL=LongMemEvalAdapter.d.ts.map
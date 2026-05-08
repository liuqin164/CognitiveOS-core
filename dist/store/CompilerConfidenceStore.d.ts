export interface CompilerConfidenceRecord {
    runId: string;
    targetType: 'memory' | 'query';
    targetId?: string;
    projectId?: string;
    compilerName: string;
    confidence: number;
    metadata?: Record<string, unknown>;
    createdAt: number;
}
export declare class CompilerConfidenceStore {
    private db;
    constructor(dbPath?: string);
    private initializeSchema;
    insert(record: CompilerConfidenceRecord): void;
    listByTarget(targetType: 'memory' | 'query', targetId: string): CompilerConfidenceRecord[];
    listByTimeRange(startTime: number, endTime: number, targetType?: 'memory' | 'query'): CompilerConfidenceRecord[];
    close(): void;
}
//# sourceMappingURL=CompilerConfidenceStore.d.ts.map
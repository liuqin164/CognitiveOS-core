export type EvalSuiteName = 'memory_recall' | 'context_pack' | 'long_horizon' | 'fast_path' | 'workspace_isolation' | 'surface_latency' | 'notification_delivery' | 'session_continuity' | 'tool_use_quality' | 'longmemeval';
export interface EvalSuiteResult {
    suiteName: EvalSuiteName;
    runAt: number;
    metrics: Record<string, number>;
    passed: boolean;
}
export declare class EvalRunner {
    runAll(): Promise<EvalSuiteResult[]>;
    runSuite(name: EvalSuiteName): Promise<EvalSuiteResult>;
}
//# sourceMappingURL=EvalRunner.d.ts.map
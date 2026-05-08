export type DeepWriteMode = 'off' | 'shadow' | 'candidate' | 'promote_guarded';
export interface DeepWriteConfig {
    enabled: boolean;
    mode: DeepWriteMode;
    contextTurns: number;
    recallLimit: number;
    minPromoteConfidence: number;
    modelRole: 'memory';
    allowCloud: boolean;
    redactionEnabled: boolean;
    promoteCausalLinks: boolean;
}
export declare function resolveDeepWriteConfig(env?: Record<string, string | undefined>): DeepWriteConfig;
//# sourceMappingURL=DeepWriteConfig.d.ts.map
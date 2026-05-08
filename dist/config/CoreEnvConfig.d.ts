import type { MemoryKernelOptions } from '../factory.js';
export interface CoreEnvDiagnostic {
    severity: 'warning' | 'error';
    code: string;
    message: string;
}
export interface ParsedCoreEnvConfig {
    options: MemoryKernelOptions;
    diagnostics: CoreEnvDiagnostic[];
}
type EnvLike = Record<string, string | undefined>;
export declare function parseCoreEnvConfig(env: EnvLike): ParsedCoreEnvConfig;
export {};
//# sourceMappingURL=CoreEnvConfig.d.ts.map
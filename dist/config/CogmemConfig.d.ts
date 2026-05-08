import type { MemoryKernelOptions } from '../factory.js';
import type { CoreEnvDiagnostic } from './CoreEnvConfig.js';
export type CogmemConfigKind = 'toml' | 'env' | 'missing';
export type EnvLike = Record<string, string | undefined>;
export interface CogmemConfigResolution {
    kind: CogmemConfigKind;
    path: string;
}
export interface CogmemConfigResolutionOptions {
    configPath?: string;
    cwd?: string;
    env?: EnvLike;
}
export interface LoadedCogmemConfig {
    configPath: string;
    homeDir: string;
    options: MemoryKernelOptions;
    env: Record<string, string>;
    paths: {
        embeddingsDir: string;
        snapshotsDir: string;
        logsDir: string;
    };
    integrations: {
        openclaw: {
            enabled: boolean;
            workspaceDir?: string;
        };
        hermes: {
            enabled: boolean;
            workspaceDir?: string;
        };
    };
    diagnostics: CoreEnvDiagnostic[];
}
export interface LoadCogmemConfigOptions extends CogmemConfigResolutionOptions {
}
export declare function defaultCogmemHome(env?: EnvLike): string;
export declare function defaultCogmemConfigPath(env?: EnvLike): string;
export declare function resolveCogmemConfigPath(options?: CogmemConfigResolutionOptions): CogmemConfigResolution;
export declare function loadCogmemConfig(options?: LoadCogmemConfigOptions): LoadedCogmemConfig;
export declare function applyCogmemConfigToEnv(loaded: LoadedCogmemConfig, targetEnv?: EnvLike): void;
//# sourceMappingURL=CogmemConfig.d.ts.map
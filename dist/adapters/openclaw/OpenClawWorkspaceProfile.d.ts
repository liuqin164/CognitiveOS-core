import { type SourceAdapterKind, type SourceDefinition } from '../types.js';
export type OpenClawSourceClassification = 'memory_source' | 'identity_profile_source' | 'operational_ignore' | 'unknown';
export interface OpenClawClassifiedPath {
    path: string;
    relativePath: string;
    classification: OpenClawSourceClassification;
    adapterKind?: SourceAdapterKind;
    reason: string;
}
export interface OpenClawWorkspaceSourceOptions {
    projectId?: string;
    date?: string;
    sessionPaths?: string[];
    optionalMemoryPaths?: string[];
}
export interface OpenClawWorkspaceSelectionDiagnostic extends OpenClawClassifiedPath {
    explicit: boolean;
    exists: boolean;
    included: boolean;
}
export interface OpenClawWorkspaceSelection {
    sources: SourceDefinition[];
    diagnostics: OpenClawWorkspaceSelectionDiagnostic[];
}
export declare class OpenClawWorkspaceProfile {
    readonly workspaceRoot: string;
    constructor(workspaceRoot: string);
    static discoverWorkspaceRoot(startPath: string): string | null;
    static looksLikeWorkspaceRoot(candidate: string): boolean;
    classifyPath(filePath: string): OpenClawClassifiedPath;
    listReferenceWorkspaceContract(): OpenClawClassifiedPath[];
    buildInstalledBatchSources(options?: OpenClawWorkspaceSourceOptions): SourceDefinition[];
    buildInstalledBatchSelection(options?: OpenClawWorkspaceSourceOptions): OpenClawWorkspaceSelection;
    private classifyExplicitPath;
    private isSessionPath;
    private result;
}
//# sourceMappingURL=OpenClawWorkspaceProfile.d.ts.map
import { type NormalizationFamily, type NormalizedSourceFamily } from '../utils/ConversationMarkdownNormalization.js';
import type { SourceAdapterDiagnostic, SourceAdapterKind, SourceDefinition } from '../adapters/index.js';
export type OnboardingLane = 'conversation_source' | 'soul_like_source' | 'user_profile' | 'agent_persona' | 'memory_index' | 'unknown';
export interface SourcePreflightReport {
    sourceId: string;
    sourcePath: string;
    adapterKind: SourceAdapterKind;
    lane: OnboardingLane;
    recordsParsed: number;
    recordsPending: number;
    diagnostics: SourceAdapterDiagnostic[];
    shouldContinue: boolean;
    rerouteSuggestion?: '--conversation' | '--soul';
    normalizationRequired: boolean;
    isNormalizedOutput: boolean;
    normalizationContract?: 'v1';
    normalizedSourceFamily?: NormalizedSourceFamily;
    originalInputFamily?: NormalizationFamily;
    normalizedFrom?: NormalizationFamily;
    routeStatus: 'supported' | 'warning' | 'reroute' | 'normalize' | 'blocked';
    recommendations: string[];
}
export interface PreflightWindow {
    start: number;
    end: number;
    label: string;
}
export interface BatchPreflightSummary {
    window: PreflightWindow;
    sourcesScanned: number;
    conversationSources: string[];
    soulLikeSources: string[];
    userProfileSources: string[];
    agentPersonaSources: string[];
    memoryIndexSources: string[];
    contractMismatchFiles: string[];
    rerouteToConversation: string[];
    rerouteToSoul: string[];
    normalizationRequired: string[];
    shouldProceed: boolean;
    sourceReports: SourcePreflightReport[];
}
export interface StrictFailure {
    sourcePath: string;
    reason: string;
}
export declare function classifyLane(source: SourceDefinition): OnboardingLane;
export declare function inspectSources(sources: SourceDefinition[], window: PreflightWindow, seenHashesBySourceId?: Map<string, Set<string>>): BatchPreflightSummary;
export declare function evaluateStrictPreflightFailures(sources: SourceDefinition[], preflight: BatchPreflightSummary): StrictFailure[];
export declare function evaluateStrictPostIngestFailures(sources: SourceDefinition[], preflight: BatchPreflightSummary, sourceResults: Array<{
    sourceId: string;
    recordsIngested: number;
    diagnostics: SourceAdapterDiagnostic[];
}>): StrictFailure[];
export declare function formatPreflightSummary(preflight: BatchPreflightSummary): string;
//# sourceMappingURL=SourceOnboarding.d.ts.map
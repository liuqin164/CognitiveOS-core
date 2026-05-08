import { basename, extname } from 'node:path';
import {
  parseNormalizationMetadata,
  type NormalizationFamily,
  type NormalizedSourceFamily
} from '../utils/ConversationMarkdownNormalization.js';
import {
  ConversationMarkdownAdapter,
  MarkdownSourceLoader,
  OpenClawDailyMemoryAdapter,
  OpenClawMemoryIndexAdapter,
  OpenClawPersonaAdapter,
  OpenClawSessionAdapter,
  OpenClawUserProfileAdapter,
  SoulMarkdownAdapter
} from '../adapters/index.js';
import type {
  AdaptedSource,
  SourceAdapter,
  SourceAdapterDiagnostic,
  SourceAdapterKind,
  SourceDefinition
} from '../adapters/index.js';

export type OnboardingLane =
  | 'conversation_source'
  | 'soul_like_source'
  | 'user_profile'
  | 'agent_persona'
  | 'memory_index'
  | 'unknown';

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

const loader = new MarkdownSourceLoader();
const adapters = new Map<SourceAdapterKind, SourceAdapter>([
  ['conversation_markdown', new ConversationMarkdownAdapter()],
  ['soul_markdown', new SoulMarkdownAdapter()],
  ['openclaw_daily_memory', new OpenClawDailyMemoryAdapter()],
  ['openclaw_session', new OpenClawSessionAdapter()],
  ['openclaw_memory_index', new OpenClawMemoryIndexAdapter()],
  ['openclaw_user_profile', new OpenClawUserProfileAdapter()],
  ['openclaw_persona', new OpenClawPersonaAdapter()]
]);

export function classifyLane(source: SourceDefinition): OnboardingLane {
  const name = basename(source.sourcePath).toLowerCase();
  if (source.adapterKind === 'openclaw_user_profile' || source.tags?.includes('namespace:user_profile') || name === 'user.md') {
    return 'user_profile';
  }
  if (
    source.adapterKind === 'openclaw_persona'
    || source.tags?.includes('namespace:agent_persona')
    || name === 'soul.md'
    || name === 'identity.md'
  ) {
    return 'agent_persona';
  }
  if (source.adapterKind === 'openclaw_memory_index' || name === 'memory.md') {
    return 'memory_index';
  }
  if (source.adapterKind === 'conversation_markdown' || source.adapterKind === 'openclaw_session') {
    return 'conversation_source';
  }
  if (source.adapterKind === 'soul_markdown' || source.adapterKind === 'openclaw_daily_memory') {
    return 'soul_like_source';
  }
  return 'unknown';
}

function hasContractMismatch(diagnostics: SourceAdapterDiagnostic[]): boolean {
  return diagnostics.some((item) => /_contract_mismatch$/.test(item.code));
}

function hasWarning(diagnostics: SourceAdapterDiagnostic[]): boolean {
  return diagnostics.some((item) => item.severity === 'warning');
}

function buildAlternateSource(source: SourceDefinition, adapterKind: SourceAdapterKind): SourceDefinition {
  return {
    ...source,
    adapterKind
  };
}

function safeAdapt(source: SourceDefinition, window: PreflightWindow, applyWindow: boolean): AdaptedSource {
  const adapter = adapters.get(source.adapterKind);
  if (!adapter) {
    throw new Error(`Unsupported adapter kind: ${source.adapterKind}`);
  }
  const snapshot = loader.read(source);
  return adapter.adapt(
    source,
    snapshot,
    applyWindow && !source.tags?.includes('ingest:profile_only')
      ? { start: window.start, end: window.end }
      : undefined
  );
}

function looksLikeNormalizationOnlyPath(sourcePath: string): boolean {
  const ext = extname(sourcePath).toLowerCase();
  return ext === '.jsonl' || ext === '.json' || ext === '.csv' || ext === '.tsv' || ext === '.log' || ext === '.txt';
}

function suggestedNormalizerForPath(sourcePath: string): string | undefined {
  const ext = extname(sourcePath).toLowerCase();
  if (ext === '.jsonl') return 'bun run normalize:jsonl -- --input ... --output ...';
  if (ext === '.json') return 'bun run normalize:json-array -- --input ... --output ...';
  if (ext === '.csv' || ext === '.tsv') return 'bun run normalize:csv -- --input ... --output ...';
  if (ext === '.log' || ext === '.txt') return 'export/preprocess outside the brain, then run a custom normalizer script';
  return undefined;
}

function looksLikeAppPrivateJsonExport(content: string, sourcePath: string): boolean {
  if (extname(sourcePath).toLowerCase() !== '.json') return false;
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return Array.isArray(parsed.events)
      && (
        typeof parsed.app === 'string'
        || typeof parsed.workspace === 'string'
        || typeof parsed.conversation === 'object'
      );
  } catch {
    return false;
  }
}

function describeNormalizationFamily(family: NormalizationFamily): string {
  switch (family) {
    case 'jsonl_transcript_export':
      return 'JSONL transcript export';
    case 'json_array_transcript_export':
      return 'JSON array transcript export';
    case 'csv_transcript_export':
      return 'CSV transcript export';
    case 'tsv_transcript_export':
      return 'TSV transcript export';
    case 'app_private_mixed_event_export':
      return 'app-private mixed-event export';
    case 'jsonl_mixed_event_log_export':
      return 'JSONL-like mixed-event log export';
    default:
      return 'unknown export';
  }
}

function probeReroute(source: SourceDefinition, window: PreflightWindow, snapshotContent?: string): {
  rerouteSuggestion?: '--conversation' | '--soul';
  normalizationRequired: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  const loweredName = basename(source.sourcePath).toLowerCase();
  if (looksLikeNormalizationOnlyPath(source.sourcePath)) {
    if (snapshotContent && looksLikeAppPrivateJsonExport(snapshotContent, source.sourcePath)) {
      return {
        normalizationRequired: true,
        recommendations: [
          'This looks like an app-private / proprietary JSON dump, not direct conversation markdown. Recommended onboarding order: export/preprocess -> normalize -> batch:preflight -> batch:consolidate --strict -> recall. First step: bun run normalize:app-private -- --input ... --output ...'
        ]
      };
    }
    const suggested = suggestedNormalizerForPath(source.sourcePath);
    return {
      normalizationRequired: true,
      recommendations: [
        suggested
          ? `This looks like a non-markdown export. Recommended onboarding order: export/preprocess -> normalize -> batch:preflight -> batch:consolidate --strict -> recall. First step: ${suggested}.`
          : 'Normalize or export this source into minimal conversation markdown before batch ingest.'
      ]
    };
  }

  if (source.adapterKind === 'conversation_markdown') {
    const alt = safeAdapt(buildAlternateSource(source, 'soul_markdown'), window, false);
    if (alt.records.length > 0) {
      recommendations.push('This file is note/profile shaped; reroute it through repeated --soul.');
      return {
        rerouteSuggestion: '--soul',
        normalizationRequired: false,
        recommendations
      };
    }
    if (loweredName === 'user.md' || loweredName === 'soul.md' || loweredName === 'identity.md' || loweredName === 'memory.md') {
      recommendations.push('Profile/persona and memory-index markdown should not be passed through --conversation.');
      return {
        rerouteSuggestion: '--soul',
        normalizationRequired: false,
        recommendations
      };
    }
  }

  if (source.adapterKind === 'soul_markdown') {
    const alt = safeAdapt(buildAlternateSource(source, 'conversation_markdown'), window, false);
    if (alt.records.length > 0) {
      recommendations.push('This file is transcript-shaped; reroute it through repeated --conversation.');
      return {
        rerouteSuggestion: '--conversation',
        normalizationRequired: false,
        recommendations
      };
    }
  }

  recommendations.push('Normalize or export this source into the supported markdown contract before ingest.');
  return {
    normalizationRequired: true,
    recommendations
  };
}

export function inspectSources(
  sources: SourceDefinition[],
  window: PreflightWindow,
  seenHashesBySourceId: Map<string, Set<string>> = new Map()
): BatchPreflightSummary {
  const sourceReports = sources.map((source) => {
    const snapshot = loader.read(source);
    const normalizationMetadata = parseNormalizationMetadata(snapshot.content);
    const adapted = safeAdapt(source, window, false);
    const windowed = safeAdapt(source, window, true);
    const seenHashes = seenHashesBySourceId.get(source.sourceId) || new Set<string>();
    const recordsPending = windowed.records.filter((record) => !seenHashes.has(record.provenance.recordHash)).length;
    const diagnostics = adapted.diagnostics || [];
    const lane = classifyLane(source);
    const mismatch = hasContractMismatch(diagnostics);
    const rerouteProbe = mismatch ? probeReroute(source, window, snapshot.content) : {
      rerouteSuggestion: undefined,
      normalizationRequired: false,
      recommendations: [] as string[]
    };
    const obviousProfileMisroute = source.adapterKind === 'conversation_markdown' && (lane === 'user_profile' || lane === 'agent_persona');
    const routeStatus = mismatch
      ? rerouteProbe.rerouteSuggestion
        ? 'reroute'
        : rerouteProbe.normalizationRequired
          ? 'normalize'
          : 'blocked'
      : hasWarning(diagnostics) || obviousProfileMisroute
        ? 'warning'
        : 'supported';
    const recommendations = [...rerouteProbe.recommendations];
    if (normalizationMetadata.isNormalized && source.adapterKind === 'conversation_markdown' && !mismatch) {
      const normalizedFamilyLabel = normalizationMetadata.originalInputFamily
        ? describeNormalizationFamily(normalizationMetadata.originalInputFamily)
        : 'normalized export';
      recommendations.push(
        `Normalized ${normalizedFamilyLabel} detected. Recommended onboarding path: export/preprocess -> normalize -> batch:preflight -> batch:consolidate --strict -> recall.`
      );
    }
    if (obviousProfileMisroute) {
      recommendations.push('Route profile/persona markdown through repeated --soul so it stays in the profile lane.');
    }
    if (!mismatch && adapted.records.length > 0 && recordsPending === 0) {
      recommendations.push('This source is parseable, but the selected window currently yields no new records.');
    }
    if (!mismatch && hasWarning(diagnostics) && diagnostics.some((item) => item.code === 'soul_missing_frontmatter_fields')) {
      recommendations.push('The file is ingestable, but add frontmatter if timestamp placement matters.');
    }

    return {
      sourceId: source.sourceId,
      sourcePath: source.sourcePath,
      adapterKind: source.adapterKind,
      lane,
      recordsParsed: adapted.records.length,
      recordsPending,
      diagnostics,
      shouldContinue: !mismatch,
      rerouteSuggestion: rerouteProbe.rerouteSuggestion,
      normalizationRequired: rerouteProbe.normalizationRequired,
      isNormalizedOutput: normalizationMetadata.isNormalized,
      normalizationContract: normalizationMetadata.contractVersion,
      normalizedSourceFamily: normalizationMetadata.normalizedSourceFamily,
      originalInputFamily: normalizationMetadata.originalInputFamily,
      normalizedFrom: normalizationMetadata.originalInputFamily,
      routeStatus,
      recommendations
    } satisfies SourcePreflightReport;
  });

  return {
    window,
    sourcesScanned: sourceReports.length,
    conversationSources: sourceReports.filter((item) => item.lane === 'conversation_source').map((item) => item.sourcePath),
    soulLikeSources: sourceReports.filter((item) => item.lane === 'soul_like_source' || item.lane === 'memory_index').map((item) => item.sourcePath),
    userProfileSources: sourceReports.filter((item) => item.lane === 'user_profile').map((item) => item.sourcePath),
    agentPersonaSources: sourceReports.filter((item) => item.lane === 'agent_persona').map((item) => item.sourcePath),
    memoryIndexSources: sourceReports.filter((item) => item.lane === 'memory_index').map((item) => item.sourcePath),
    contractMismatchFiles: sourceReports.filter((item) => hasContractMismatch(item.diagnostics)).map((item) => item.sourcePath),
    rerouteToConversation: sourceReports.filter((item) => item.rerouteSuggestion === '--conversation').map((item) => item.sourcePath),
    rerouteToSoul: sourceReports.filter((item) => item.rerouteSuggestion === '--soul').map((item) => item.sourcePath),
    normalizationRequired: sourceReports.filter((item) => item.normalizationRequired).map((item) => item.sourcePath),
    shouldProceed: sourceReports.every((item) => item.shouldContinue),
    sourceReports
  };
}

function isCriticalSource(source: SourceDefinition): boolean {
  return source.metadata?.strictCritical === true;
}

export function evaluateStrictPreflightFailures(
  sources: SourceDefinition[],
  preflight: BatchPreflightSummary
): StrictFailure[] {
  const failures: StrictFailure[] = [];
  for (const source of sources) {
    if (!isCriticalSource(source)) continue;
    const report = preflight.sourceReports.find((item) => item.sourceId === source.sourceId);
    if (!report) continue;
    if (report.normalizationRequired) {
      const snapshot = loader.read(source);
      if (looksLikeAppPrivateJsonExport(snapshot.content, source.sourcePath)) {
        failures.push({
          sourcePath: source.sourcePath,
          reason: 'Source requires export/preprocess before ingest. Recommended onboarding order: export/preprocess -> normalize -> batch:preflight -> batch:consolidate --strict -> recall. First step: bun run normalize:app-private -- --input ... --output ...'
        });
        continue;
      }
      const suggested = suggestedNormalizerForPath(source.sourcePath);
      failures.push({
        sourcePath: source.sourcePath,
        reason: suggested
          ? `Source requires normalization/export before ingest. Recommended onboarding order: export/preprocess -> normalize -> batch:preflight -> batch:consolidate --strict -> recall. First step: ${suggested}`
          : 'Source requires normalization/export before ingest.'
      });
      continue;
    }
    if (report.diagnostics.some((item) => item.code === 'conversation_contract_mismatch')) {
      failures.push({
        sourcePath: source.sourcePath,
        reason: 'Explicit --conversation source does not match the conversation contract.'
      });
      continue;
    }
    if (source.adapterKind === 'conversation_markdown' && (report.lane === 'user_profile' || report.lane === 'agent_persona')) {
      failures.push({
        sourcePath: source.sourcePath,
        reason: 'Profile/persona markdown was routed through --conversation.'
      });
      continue;
    }
    if (report.rerouteSuggestion) {
      failures.push({
        sourcePath: source.sourcePath,
        reason: `Source should be rerouted through ${report.rerouteSuggestion}.`
      });
      continue;
    }
  }
  return failures;
}

export function evaluateStrictPostIngestFailures(
  sources: SourceDefinition[],
  preflight: BatchPreflightSummary,
  sourceResults: Array<{ sourceId: string; recordsIngested: number; diagnostics: SourceAdapterDiagnostic[] }>
): StrictFailure[] {
  const failures: StrictFailure[] = [];
  for (const source of sources) {
    if (!isCriticalSource(source)) continue;
    const report = preflight.sourceReports.find((item) => item.sourceId === source.sourceId);
    const result = sourceResults.find((item) => item.sourceId === source.sourceId);
    if (!report || !result) continue;
    const misroutingDiagnostic = result.diagnostics.some((item) =>
      item.code === 'conversation_contract_mismatch' || item.code === 'soul_contract_mismatch'
    );
    if (result.recordsIngested === 0 && misroutingDiagnostic) {
      failures.push({
        sourcePath: source.sourcePath,
        reason: 'Critical source did not ingest any records because the current route is mismatched.'
      });
      continue;
    }
    if (result.recordsIngested === 0 && report.recordsPending > 0 && report.diagnostics.every((item) => item.severity === 'warning')) {
      failures.push({
        sourcePath: source.sourcePath,
        reason: 'Critical source produced warning-only output but no records reached the brain.'
      });
    }
  }
  return failures;
}

export function formatPreflightSummary(preflight: BatchPreflightSummary): string {
  const lines: string[] = [];
  const addGroup = (label: string, paths: string[]): void => {
    lines.push(`${label}: ${paths.length}`);
    for (const path of paths) {
      lines.push(`  - ${path}`);
    }
  };

  lines.push(`Batch preflight for ${preflight.window.label}`);
  lines.push(`Proceed: ${preflight.shouldProceed ? 'yes' : 'no'}`);
  lines.push(`Recommended onboarding path: ${preflight.normalizationRequired.length > 0 ? 'export/preprocess -> normalize -> ' : ''}batch:preflight -> batch:consolidate --strict -> recall`);
  lines.push('');
  addGroup('Conversation sources', preflight.conversationSources);
  addGroup('Soul-like sources', preflight.soulLikeSources);
  addGroup('User profile sources', preflight.userProfileSources);
  addGroup('Agent persona sources', preflight.agentPersonaSources);
  if (preflight.contractMismatchFiles.length > 0) {
    lines.push('');
    addGroup('Contract mismatches', preflight.contractMismatchFiles);
  }
  if (preflight.rerouteToConversation.length > 0) {
    lines.push('');
    addGroup('Should reroute to --conversation', preflight.rerouteToConversation);
  }
  if (preflight.rerouteToSoul.length > 0) {
    lines.push('');
    addGroup('Should reroute to --soul', preflight.rerouteToSoul);
  }
  if (preflight.normalizationRequired.length > 0) {
    lines.push('');
    addGroup('Normalization/export required', preflight.normalizationRequired);
  }

  lines.push('');
  lines.push('Per-source details:');
  for (const report of preflight.sourceReports) {
    lines.push(`- ${report.sourcePath}`);
    lines.push(`  lane=${report.lane} status=${report.routeStatus} parsed=${report.recordsParsed} pending=${report.recordsPending}${report.isNormalizedOutput ? ` normalized_output=true` : ''}${report.normalizationContract ? ` normalization_contract=${report.normalizationContract}` : ''}${report.normalizedSourceFamily ? ` normalized_source_family=${report.normalizedSourceFamily}` : ''}${report.originalInputFamily ? ` original_input_family=${report.originalInputFamily}` : ''}`);
    for (const diagnostic of report.diagnostics) {
      lines.push(`  diagnostic=${diagnostic.severity}:${diagnostic.code} ${diagnostic.message}`);
    }
    for (const recommendation of report.recommendations) {
      lines.push(`  suggestion=${recommendation}`);
    }
  }

  return lines.join('\n');
}

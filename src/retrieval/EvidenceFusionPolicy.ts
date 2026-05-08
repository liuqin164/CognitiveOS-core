import { ContextFusionPath, FusionResolutionReason, type ContextPack, type Neuron } from '../types/index.js';
import type { QueryTimePendingEntityResolutionHookOutput } from '../types/QueryTimePendingEntityResolution.js';
import { classifyIssueFamilies } from '../lexicon/coreMemoryLexicon.js';

export interface EvidenceFusionPolicyInput {
  compiledFacts: ContextPack['compiledFacts'];
  compiledEvidence: ContextPack['compiledEvidence'];
  rawEvidence: ContextPack['rawEvidence'];
  supportingEpisodes: ContextPack['supportingEpisodes'];
  queryTimePendingEntityResolution?: QueryTimePendingEntityResolutionHookOutput;
}

export interface EvidenceFusionPolicyDecision {
  fusionPath: ContextFusionPath;
  chosenEvidence: Array<{ source: 'compiled' | 'raw'; evidenceId: string }>;
  rejectedEvidence: Array<{ source: 'compiled' | 'raw'; evidenceId: string; reason: string }>;
  resolutionReason?: FusionResolutionReason;
  conflictTrace: ContextPack['conflictTrace'];
}

export interface EvidenceFusionPolicy {
  decide(input: EvidenceFusionPolicyInput): EvidenceFusionPolicyDecision;
}

export class DefaultEvidenceFusionPolicy implements EvidenceFusionPolicy {
  decide(input: EvidenceFusionPolicyInput): EvidenceFusionPolicyDecision {
    const hasCompiled = input.compiledEvidence.length > 0;
    const hasRaw = input.rawEvidence.length > 0;

    if (hasCompiled && !hasRaw) {
      return {
        fusionPath: ContextFusionPath.COMPILED_ONLY,
        chosenEvidence: input.compiledEvidence.map((item) => ({ source: 'compiled' as const, evidenceId: item.evidenceId })),
        rejectedEvidence: [],
        resolutionReason: FusionResolutionReason.COMPILED_WINS,
        conflictTrace: []
      };
    }

    if (!hasCompiled && hasRaw) {
      return {
        fusionPath: ContextFusionPath.RAW_ONLY,
        chosenEvidence: input.rawEvidence.map((item) => ({ source: 'raw' as const, evidenceId: item.neuronId })),
        rejectedEvidence: [],
        resolutionReason: FusionResolutionReason.RAW_WINS,
        conflictTrace: []
      };
    }

    if (!hasCompiled && !hasRaw) {
      return {
        fusionPath: ContextFusionPath.RAW_ONLY,
        chosenEvidence: [],
        rejectedEvidence: [],
        conflictTrace: []
      };
    }

    const conflictTrace = findFusionConflict(input.compiledFacts, input.supportingEpisodes);
    if (conflictTrace.length > 0) {
      const rejectedRawIds = new Set(conflictTrace.map((item) => item.conflictingRawContent));
      return {
        fusionPath: ContextFusionPath.CONFLICT_RESOLVED,
        chosenEvidence: [
          ...input.compiledEvidence.map((item) => ({ source: 'compiled' as const, evidenceId: item.evidenceId })),
          ...input.rawEvidence
            .filter((item) => !rejectedRawIds.has(item.content))
            .map((item) => ({ source: 'raw' as const, evidenceId: item.neuronId }))
        ],
        rejectedEvidence: input.rawEvidence
          .filter((item) => rejectedRawIds.has(item.content))
          .map((item) => ({ source: 'raw' as const, evidenceId: item.neuronId, reason: 'conflict_resolved' })),
        resolutionReason: conflictTrace[0]?.resolutionReason,
        conflictTrace
      };
    }

    return {
      fusionPath: ContextFusionPath.COMPILED_PLUS_RAW,
      chosenEvidence: [
        ...input.compiledEvidence.map((item) => ({ source: 'compiled' as const, evidenceId: item.evidenceId })),
        ...input.rawEvidence.map((item) => ({ source: 'raw' as const, evidenceId: item.neuronId }))
      ],
      rejectedEvidence: [],
      conflictTrace: []
    };
  }
}

function findFusionConflict(
  compiledFacts: ContextPack['compiledFacts'],
  supportingEpisodes: ContextPack['supportingEpisodes']
): ContextPack['conflictTrace'] {
  const targetFact = compiledFacts.find((fact) => ['has_issue', 'likes', 'dislikes'].includes(fact.predicateFamily));
  if (!targetFact) return [];

  const compiledSignal = extractConflictSignal(
    [targetFact.predicateValue, targetFact.object, targetFact.sourceText].filter(Boolean).join(' ')
  );
  if (!compiledSignal) return [];

  for (const episode of supportingEpisodes) {
    if (episode.neuron.id === targetFact.neuronId) continue;
    const rawSignal = extractConflictSignal(episode.neuron.content);
    if (!rawSignal) continue;
    if (rawSignal.domain !== compiledSignal.domain) continue;
    if (rawSignal.value === compiledSignal.value) continue;

    return [{
      conflictingRawContent: episode.neuron.content,
      conflictingCompiledFact: {
        factId: targetFact.factId,
        subject: targetFact.subject,
        predicateFamily: targetFact.predicateFamily,
        predicateValue: targetFact.predicateValue,
        object: targetFact.object,
        confidence: targetFact.confidence
      },
      resolutionReason: pickFusionResolutionReason(targetFact, episode.neuron)
    }];
  }

  return [];
}

function extractConflictSignal(text: string): { domain: 'issue' | 'preference'; value: string } | null {
  const issueFamilies = classifyIssueFamilies(text);
  if (issueFamilies.length > 0) return { domain: 'issue', value: issueFamilies[0] };
  if (/(喜欢|i like)/i.test(text)) return { domain: 'preference', value: 'like' };
  if (/(讨厌|不喜欢|i dislike)/i.test(text)) return { domain: 'preference', value: 'dislike' };
  return null;
}

function pickFusionResolutionReason(
  fact: ContextPack['compiledFacts'][number],
  rawNeuron: Neuron
): FusionResolutionReason {
  if (fact.confidence >= 0.9) return FusionResolutionReason.COMPILED_WINS;
  if (rawNeuron.metadata.createdAt > fact.validFrom) return FusionResolutionReason.RECENCY_WINS;
  if (fact.confidence >= 0.8) return FusionResolutionReason.TRUST_SCORE_HIGHER;
  return FusionResolutionReason.RAW_WINS;
}

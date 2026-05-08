import { createHash } from 'crypto';
import type { DeepWriteConfig } from './DeepWriteConfig.js';
import {
  DeepWriteMemoryCompiler,
  type DeepWriteMemoryCompilerInput,
  type DeepWriteTurnInput
} from './DeepWriteMemoryCompiler.js';
import {
  DeepWriteCandidateStore,
  type DeepWriteCandidateInput,
  type DeepWriteCandidateStatus
} from '../store/DeepWriteCandidateStore.js';
import type { DeepWritePromotionPolicy } from './DeepWritePromotionPolicy.js';
import type { CustomRedactor, DeepWriteRedactor } from './DeepWriteRedactor.js';

export interface DeepWriteRecallResultLike {
  compiledMemory?: {
    facts?: unknown[];
    beliefs?: unknown[];
    events?: unknown[];
    entityTimeline?: unknown[];
  };
  rawEvidence?: Array<{
    id?: string;
    content?: string;
    metadata?: {
      createdAt?: number;
      tags?: string[];
    };
  }>;
  profileSurface?: {
    userProfile?: unknown[];
    agentPersona?: unknown[];
  };
}

export interface DeepWriteMemoryOrchestratorInput {
  projectId?: string;
  sessionId?: string;
  sourceNeuronIds: string[];
  currentExchange: DeepWriteMemoryCompilerInput['currentExchange'];
  recentTurns: DeepWriteTurnInput[];
}

export interface DeepWriteMemoryOrchestratorDeps {
  config: DeepWriteConfig;
  store: DeepWriteCandidateStore;
  compiler: DeepWriteMemoryCompiler;
  recall: (query: string, options?: { projectId?: string; limit?: number; includeRawEvidence?: boolean }) => DeepWriteRecallResultLike;
  modelProvider?: string;
  modelName?: string;
  redactor?: DeepWriteRedactor;
  customRedactors?: CustomRedactor[];
  promotionPolicy?: DeepWritePromotionPolicy;
}

const CATEGORY_KEYS = [
  'summary',
  'entities',
  'facts',
  'relations',
  'causalLinks',
  'preferences',
  'emotionalSignals',
  'metaphorInterpretations',
  'contradictions',
  'unresolvedQuestions'
] as const;

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function confidenceOf(value: unknown): number {
  if (!value || typeof value !== 'object') return 0.5;
  const confidence = Number((value as { confidence?: unknown }).confidence);
  return Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5;
}

function evidenceOf(value: unknown): unknown[] {
  if (!value || typeof value !== 'object') return [];
  return toArray((value as { evidence?: unknown }).evidence);
}

export class DeepWriteMemoryOrchestrator {
  constructor(private readonly deps: DeepWriteMemoryOrchestratorDeps) {}

  async run(input: DeepWriteMemoryOrchestratorInput): Promise<{ runId?: string; candidateCount: number; skipped: boolean }> {
    if (!this.deps.config.enabled || this.deps.config.mode === 'off') {
      return { candidateCount: 0, skipped: true };
    }

    const recallQuery = [
      input.currentExchange.userText,
      input.currentExchange.assistantText || ''
    ].join('\n').trim();

    const recalled = this.deps.recall(recallQuery, {
      projectId: input.projectId,
      limit: this.deps.config.recallLimit,
      includeRawEvidence: true
    });

    let compilerInput: DeepWriteMemoryCompilerInput = {
      projectId: input.projectId,
      sessionId: input.sessionId,
      currentExchange: input.currentExchange,
      recentTurns: input.recentTurns.slice(-this.deps.config.contextTurns),
      recalledMemory: {
        facts: recalled.compiledMemory?.facts || [],
        beliefs: recalled.compiledMemory?.beliefs || [],
        entities: [
          ...(recalled.compiledMemory?.entityTimeline || []),
          ...(recalled.profileSurface?.userProfile || []),
          ...(recalled.profileSurface?.agentPersona || [])
        ],
        rawEvidence: (recalled.rawEvidence || []).map((item) => ({
          neuronId: item.id || '',
          content: item.content || '',
          createdAt: item.metadata?.createdAt || 0,
          tags: item.metadata?.tags || []
        })).filter((item) => item.neuronId && item.content)
      }
    };

    if (this.deps.config.redactionEnabled && this.deps.redactor) {
      compilerInput = this.deps.redactor.redact(compilerInput).value;
      for (const redactor of this.deps.customRedactors || []) {
        compilerInput = redactor.redact(compilerInput).value as DeepWriteMemoryCompilerInput;
      }
    }

    const promptHash = hash(JSON.stringify(compilerInput));

    try {
      const compiled = await this.deps.compiler.compile(compilerInput);
      const outputHash = hash(compiled.rawOutput || JSON.stringify(compiled.output));
      const run = this.deps.store.insertRun({
        projectId: input.projectId,
        sessionId: input.sessionId,
        sourceNeuronIds: input.sourceNeuronIds,
        modelProvider: this.deps.modelProvider,
        modelName: this.deps.modelName,
        mode: this.deps.config.mode,
        promptHash,
        outputHash,
        status: 'succeeded'
      });

      const candidates = this.flattenCandidates(run.runId, compiled.output, compilerInput);
      const inserted = this.deps.store.insertCandidates(candidates);
      if (this.deps.config.mode === 'promote_guarded' && this.deps.promotionPolicy) {
        this.deps.promotionPolicy.promoteRun(run.runId);
      }
      return { runId: run.runId, candidateCount: inserted.length, skipped: false };
    } catch (error) {
      const run = this.deps.store.insertRun({
        projectId: input.projectId,
        sessionId: input.sessionId,
        sourceNeuronIds: input.sourceNeuronIds,
        modelProvider: this.deps.modelProvider,
        modelName: this.deps.modelName,
        mode: this.deps.config.mode,
        promptHash,
        outputHash: hash(''),
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      });
      return { runId: run.runId, candidateCount: 0, skipped: false };
    }
  }

  private flattenCandidates(
    runId: string,
    output: Record<string, unknown>,
    compilerInput: DeepWriteMemoryCompilerInput
  ): DeepWriteCandidateInput[] {
    const status: DeepWriteCandidateStatus = this.deps.config.mode === 'shadow' ? 'shadow' : 'candidate';
    const candidates: DeepWriteCandidateInput[] = [];
    const roleByNeuronId = this.buildEvidenceRoleMap(compilerInput);

    for (const key of CATEGORY_KEYS) {
      for (const item of toArray(output[key])) {
        const evidence = evidenceOf(item).map((entry) => this.attachEvidenceRole(entry, roleByNeuronId));
        if (evidence.length === 0) continue;
        candidates.push({
          runId,
          candidateType: key,
          status,
          confidence: confidenceOf(item),
          content: item,
          evidence
        });
      }
    }

    return candidates;
  }

  private buildEvidenceRoleMap(input: DeepWriteMemoryCompilerInput): Map<string, 'user' | 'assistant'> {
    const roleByNeuronId = new Map<string, 'user' | 'assistant'>();
    for (const item of input.recalledMemory.rawEvidence) {
      const raw = item as { neuronId?: string; content?: string; tags?: string[] };
      if (!raw.neuronId) continue;
      const tags = raw.tags || [];
      const role = tags.some((tag) => tag === 'turn_role:user')
        || /^User:/i.test(raw.content || '')
        ? 'user'
        : tags.some((tag) => tag === 'turn_role:assistant') || /^Assistant:/i.test(raw.content || '')
          ? 'assistant'
          : undefined;
      if (role) roleByNeuronId.set(raw.neuronId, role);
    }
    if (this.deps.config.mode !== 'off') {
      const userId = input.currentExchange.userTurnId;
      const assistantId = input.currentExchange.assistantTurnId;
      if (userId) roleByNeuronId.set(userId, 'user');
      if (assistantId) roleByNeuronId.set(assistantId, 'assistant');
    }
    return roleByNeuronId;
  }

  private attachEvidenceRole(entry: unknown, roleByNeuronId: Map<string, 'user' | 'assistant'>): unknown {
    if (typeof entry === 'string') {
      const role = roleByNeuronId.get(entry);
      return role ? { neuronId: entry, role } : entry;
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const record = entry as Record<string, unknown>;
    const id = ['neuronId', 'neuron_id', 'sourceId', 'sourceNeuronId', 'id']
      .map((key) => record[key])
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const role = id ? roleByNeuronId.get(id) : undefined;
    return role && !record.role ? { ...record, role } : record;
  }
}

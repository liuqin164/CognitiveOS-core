// @ts-nocheck
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type SemanticBackendMode = 'deterministic_local' | 'rule_only' | 'model_backed' | 'hybrid';
export type SemanticBackendProviderId = 'deterministic-local' | 'rule-only' | 'gemma4-e4b-local' | 'hybrid-rule-plus-gemma4-e4b';
export type SemanticBackendTask = 'offline_deep_consolidation' | 'async_low_confidence_enrichment' | 'optional_semantic_task';

export interface SemanticBackendConfig {
  mode: SemanticBackendMode;
  providerId: SemanticBackendProviderId;
  modelPath?: string;
  readinessFile: string;
  requireReady: boolean;
}

export interface SemanticBackendStatus {
  mode: SemanticBackendMode;
  providerId: SemanticBackendProviderId;
  ready: boolean;
  requiresExplicitSetup: boolean;
  modelPath?: string;
  readinessFile: string;
  eligibleTasks: SemanticBackendTask[];
  failureBehavior: 'no_effect' | 'rule_only_fallback' | 'explicit_failure';
  fallbackBackend: 'rule_only' | null;
  reason: string;
}

export interface SemanticBackendInvocation {
  task: SemanticBackendTask;
  selectedBackend: SemanticBackendProviderId | 'rule-only-fallback';
  fallbackUsed: boolean;
  ready: boolean;
  reason: string;
}

const DEFAULT_CACHE_ROOT = resolve(process.env.AGENT_BRAIN_CACHE_DIR || `${process.env.HOME || '/tmp'}/.cache/agent-brain`);
const DEFAULT_READY_FILE = join(DEFAULT_CACHE_ROOT, 'semantic-backends', 'gemma4-e4b-ready.json');

export function resolveSemanticBackendConfig(): SemanticBackendConfig {
  const mode = ((process.env.AGENT_BRAIN_SEMANTIC_BACKEND_MODE || 'rule_only').trim() || 'rule_only') as SemanticBackendMode;
  const modelPath = process.env.AGENT_BRAIN_GEMMA4_E4B_PATH
    ? resolve(process.env.AGENT_BRAIN_GEMMA4_E4B_PATH)
    : undefined;
  const readinessFile = resolve(process.env.AGENT_BRAIN_SEMANTIC_BACKEND_READY_FILE || DEFAULT_READY_FILE);

  if (mode === 'model_backed') {
    return {
      mode,
      providerId: 'gemma4-e4b-local',
      modelPath,
      readinessFile,
      requireReady: process.env.AGENT_BRAIN_SEMANTIC_BACKEND_REQUIRE_READY === 'true'
    };
  }

  if (mode === 'hybrid') {
    return {
      mode,
      providerId: 'hybrid-rule-plus-gemma4-e4b',
      modelPath,
      readinessFile,
      requireReady: false
    };
  }

  if (mode === 'deterministic_local') {
    return {
      mode,
      providerId: 'deterministic-local',
      readinessFile,
      requireReady: false
    };
  }

  return {
    mode: 'rule_only',
    providerId: 'rule-only',
    readinessFile,
    requireReady: false
  };
}

export class SemanticBackendRuntime {
  constructor(private readonly config: SemanticBackendConfig = resolveSemanticBackendConfig()) {}

  getStatus(): SemanticBackendStatus {
    const ready = this.isReady();
    const eligibleTasks = this.config.mode === 'rule_only' || this.config.mode === 'deterministic_local'
      ? []
      : ['offline_deep_consolidation', 'async_low_confidence_enrichment', 'optional_semantic_task'];
    const failureBehavior = this.config.mode === 'model_backed'
      ? (this.config.requireReady ? 'explicit_failure' : 'rule_only_fallback')
      : this.config.mode === 'hybrid'
        ? 'rule_only_fallback'
        : 'no_effect';
    return {
      mode: this.config.mode,
      providerId: this.config.providerId,
      ready,
      requiresExplicitSetup: this.config.mode === 'model_backed' || this.config.mode === 'hybrid',
      modelPath: this.config.modelPath,
      readinessFile: this.config.readinessFile,
      eligibleTasks,
      failureBehavior,
      fallbackBackend: failureBehavior === 'rule_only_fallback' ? 'rule_only' : null,
      reason: ready ? 'ready' : this.explainNotReady()
    };
  }

  warmup(): SemanticBackendStatus {
    const status = this.getStatus();
    if (!status.requiresExplicitSetup) return status;
    if (!this.config.modelPath || !existsSync(this.config.modelPath)) return status;
    if (!statSync(this.config.modelPath).isDirectory()) return status;
    mkdirSync(dirname(this.config.readinessFile), { recursive: true });
    writeFileSync(this.config.readinessFile, JSON.stringify({
      providerId: this.config.providerId,
      modelPath: this.config.modelPath,
      warmedAt: new Date().toISOString()
    }, null, 2));
    return this.getStatus();
  }

  prepare(task: SemanticBackendTask): SemanticBackendInvocation {
    const status = this.getStatus();
    if (status.mode === 'rule_only' || status.mode === 'deterministic_local') {
      return {
        task,
        selectedBackend: status.providerId,
        fallbackUsed: false,
        ready: true,
        reason: 'default_no_download_backend'
      };
    }
    if (status.ready) {
      return {
        task,
        selectedBackend: status.providerId,
        fallbackUsed: false,
        ready: true,
        reason: 'explicit_model_backend_ready'
      };
    }
    if (status.failureBehavior === 'explicit_failure') {
      throw new Error(`Semantic backend ${status.providerId} is not ready: ${status.reason}`);
    }
    return {
      task,
      selectedBackend: 'rule-only-fallback',
      fallbackUsed: true,
      ready: false,
      reason: status.reason
    };
  }

  private isReady(): boolean {
    if (this.config.mode === 'rule_only' || this.config.mode === 'deterministic_local') return true;
    if (!this.config.modelPath || !existsSync(this.config.modelPath)) return false;
    return existsSync(this.config.readinessFile);
  }

  private explainNotReady(): string {
    if (this.config.mode === 'rule_only' || this.config.mode === 'deterministic_local') return 'no_model_required';
    if (!this.config.modelPath) return 'missing_model_path';
    if (!existsSync(this.config.modelPath)) return 'missing_local_model';
    if (!existsSync(this.config.readinessFile)) return 'setup_not_run';
    return 'not_ready';
  }
}

import { describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SemanticBackendRuntime } from '../src/backend/SemanticBackend.js';

describe('Semantic Backend Boundary', () => {
  it('keeps the default path independent from Gemma 4 E4B', () => {
    const runtime = new SemanticBackendRuntime({
      mode: 'rule_only',
      providerId: 'rule-only',
      readinessFile: '/tmp/unused-ready.json',
      requireReady: false
    });

    const status = runtime.getStatus();
    const invocation = runtime.prepare('offline_deep_consolidation');

    expect(status.ready).toBe(true);
    expect(status.requiresExplicitSetup).toBe(false);
    expect(invocation.selectedBackend).toBe('rule-only');
    expect(invocation.fallbackUsed).toBe(false);
  });

  it('warms up Gemma 4 E4B explicitly and then selects it for offline consolidation', () => {
    const modelDir = `/tmp/cogmem-gemma-${Date.now()}`;
    const readyFile = join(modelDir, 'ready.json');
    mkdirSync(modelDir, { recursive: true });

    const runtime = new SemanticBackendRuntime({
      mode: 'model_backed',
      providerId: 'gemma4-e4b-local',
      modelPath: modelDir,
      readinessFile: readyFile,
      requireReady: false
    });

    expect(runtime.getStatus().ready).toBe(false);
    const warmed = runtime.warmup();
    const invocation = runtime.prepare('offline_deep_consolidation');

    expect(warmed.ready).toBe(true);
    expect(existsSync(readyFile)).toBe(true);
    expect(invocation.selectedBackend).toBe('gemma4-e4b-local');
    expect(invocation.fallbackUsed).toBe(false);

    rmSync(modelDir, { recursive: true, force: true });
  });

  it('falls back deterministically when Gemma is requested but not prepared', () => {
    const runtime = new SemanticBackendRuntime({
      mode: 'hybrid',
      providerId: 'hybrid-rule-plus-gemma4-e4b',
      modelPath: '/tmp/cogmem-missing-gemma-model',
      readinessFile: '/tmp/cogmem-missing-gemma-ready.json',
      requireReady: false
    });

    const status = runtime.getStatus();
    const invocation = runtime.prepare('offline_deep_consolidation');

    expect(status.ready).toBe(false);
    expect(status.failureBehavior).toBe('rule_only_fallback');
    expect(invocation.selectedBackend).toBe('rule-only-fallback');
    expect(invocation.fallbackUsed).toBe(true);
  });

  it('fails clearly when model_backed mode explicitly requires warmup readiness', () => {
    const runtime = new SemanticBackendRuntime({
      mode: 'model_backed',
      providerId: 'gemma4-e4b-local',
      modelPath: '/tmp/cogmem-missing-gemma-model-explicit',
      readinessFile: '/tmp/cogmem-missing-gemma-ready-explicit.json',
      requireReady: true
    });

    expect(runtime.getStatus().failureBehavior).toBe('explicit_failure');
    expect(() => runtime.prepare('offline_deep_consolidation')).toThrow(/not ready/);
  });

  it('does not silently report success when warmup cannot complete', () => {
    const runtime = new SemanticBackendRuntime({
      mode: 'model_backed',
      providerId: 'gemma4-e4b-local',
      modelPath: '/tmp/cogmem-missing-gemma-model-no-warmup',
      readinessFile: '/tmp/cogmem-missing-gemma-ready-no-warmup.json',
      requireReady: false
    });

    const warmed = runtime.warmup();
    const invocation = runtime.prepare('optional_semantic_task');

    expect(warmed.ready).toBe(false);
    expect(warmed.reason).toBe('missing_local_model');
    expect(invocation.selectedBackend).toBe('rule-only-fallback');
    expect(invocation.fallbackUsed).toBe(true);
    expect(invocation.reason).toBe('missing_local_model');
  });
});

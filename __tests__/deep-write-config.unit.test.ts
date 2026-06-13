import { describe, expect, test } from 'bun:test';

import { resolveDeepWriteConfig } from '../src/engine/DeepWriteConfig.js';

describe('deep write config', () => {
  test('uses cogmem environment names for explicit process-level overrides', () => {
    const config = resolveDeepWriteConfig({
      COGMEM_DEEP_WRITE_ENABLED: 'true',
      COGMEM_DEEP_WRITE_MODE: 'candidate',
      COGMEM_DEEP_WRITE_CONTEXT_TURNS: '12',
      COGMEM_DEEP_WRITE_RECALL_LIMIT: '8',
      COGMEM_DEEP_WRITE_MIN_PROMOTE_CONFIDENCE: '0.7',
      COGMEM_DEEP_WRITE_ALLOW_CLOUD: 'yes',
      COGMEM_DEEP_WRITE_REDACTION_ENABLED: 'false',
      COGMEM_DEEP_WRITE_PROMOTE_CAUSAL: '1',
    });

    expect(config).toMatchObject({
      enabled: true,
      mode: 'candidate',
      contextTurns: 12,
      recallLimit: 8,
      minPromoteConfidence: 0.7,
      allowCloud: true,
      redactionEnabled: false,
      promoteCausalLinks: true,
    });
  });

  test('keeps legacy agent brain names as migration fallback only', () => {
    const config = resolveDeepWriteConfig({
      AGENT_BRAIN_DEEP_WRITE_ENABLED: 'true',
      AGENT_BRAIN_DEEP_WRITE_MODE: 'shadow',
      AGENT_BRAIN_DEEP_WRITE_CONTEXT_TURNS: '9',
      AGENT_BRAIN_DEEP_WRITE_RECALL_LIMIT: '5',
    });

    expect(config.enabled).toBe(true);
    expect(config.mode).toBe('shadow');
    expect(config.contextTurns).toBe(9);
    expect(config.recallLimit).toBe(5);
  });

  test('prefers cogmem names over legacy names when both are present', () => {
    const config = resolveDeepWriteConfig({
      COGMEM_DEEP_WRITE_ENABLED: 'true',
      COGMEM_DEEP_WRITE_MODE: 'candidate',
      AGENT_BRAIN_DEEP_WRITE_ENABLED: 'false',
      AGENT_BRAIN_DEEP_WRITE_MODE: 'off',
    });

    expect(config.enabled).toBe(true);
    expect(config.mode).toBe('candidate');
  });
});

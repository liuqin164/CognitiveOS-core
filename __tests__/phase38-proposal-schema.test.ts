import { describe, expect, test } from 'bun:test';
import Database from 'bun:sqlite';
import { ProposalLedger } from '../src/meta/ProposalLedger.js';
import { PolicyProposalGenerator } from '../src/meta/PolicyProposalGenerator.js';
import type { ObservationPattern, PolicyProposal, ProposalCategory } from '../src/meta/types.js';

function makePattern(overrides: Partial<ObservationPattern> & Pick<ObservationPattern, 'type'>): ObservationPattern {
  return {
    type: overrides.type,
    occurrenceCount: overrides.occurrenceCount ?? 3,
    evidenceEventIds: overrides.evidenceEventIds ?? ['evt-1', 'evt-2'],
    capabilityId: overrides.capabilityId,
    url: overrides.url,
    factId: overrides.factId,
    metricName: overrides.metricName,
    currentValue: overrides.currentValue,
    baselineValue: overrides.baselineValue,
    failureRate: overrides.failureRate
  };
}

function generateOne(pattern: ObservationPattern) {
  return new PolicyProposalGenerator().generate([pattern])[0]!;
}

function makeLedger(db = new Database(':memory:')): ProposalLedger {
  const ledger = new ProposalLedger(db);
  ledger.initSchema();
  return ledger;
}

function makeProposal(overrides: Partial<PolicyProposal> = {}): PolicyProposal {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    proposedAt: overrides.proposedAt ?? Date.now(),
    category: overrides.category ?? 'context_pack_policy',
    summary: overrides.summary ?? 'proposal summary',
    evidence: overrides.evidence ?? [{ traceEventId: 'evt-1', note: 'evidence #1' }],
    suggestedChange: overrides.suggestedChange ?? { action: 'adjust' },
    status: overrides.status ?? 'pending',
    evalReport: overrides.evalReport,
    appliedAt: overrides.appliedAt,
    rejectedAt: overrides.rejectedAt,
    evalPlan: overrides.evalPlan,
    riskLevel: overrides.riskLevel,
    applyMode: overrides.applyMode
  };
}

function generateWithOverriddenApplyMode(
  pattern: ObservationPattern,
  applyMode: 'config' | 'patch_only'
): PolicyProposal {
  const generator = new PolicyProposalGenerator() as any;
  const originalBuildBase = generator.buildBase.bind(generator);
  generator.buildBase = (entry: ObservationPattern) => ({
    ...originalBuildBase(entry),
    applyMode
  });
  return generator.generate([pattern])[0]!;
}

describe('Phase 38 proposal schema', () => {
  test('PolicyProposal supports evalPlan as an array', () => {
    const proposal: PolicyProposal = makeProposal({ evalPlan: ['memory_recall', 'fast_path'] });
    expect(Array.isArray(proposal.evalPlan)).toBe(true);
    expect(proposal.evalPlan).toEqual(['memory_recall', 'fast_path']);
  });

  test('PolicyProposal supports riskLevel enum values', () => {
    const proposal: PolicyProposal = makeProposal({ riskLevel: 'high' });
    expect(proposal.riskLevel).toBeDefined();
    expect(['low', 'medium', 'high']).toContain(proposal.riskLevel!);
  });

  test('PolicyProposal supports applyMode enum values', () => {
    const proposal: PolicyProposal = makeProposal({ applyMode: 'config' });
    expect(proposal.applyMode).toBeDefined();
    expect(['config', 'patch_only']).toContain(proposal.applyMode!);
  });

  test('fast_path_miss_pattern generates context_pack_policy', () => {
    const proposal = generateOne(makePattern({ type: 'fast_path_miss_pattern', currentValue: 0.22 }));
    expect(proposal.category).toBe('context_pack_policy');
  });

  test('fast_path_miss_pattern uses low riskLevel', () => {
    const proposal = generateOne(makePattern({ type: 'fast_path_miss_pattern', currentValue: 0.22 }));
    expect(proposal.riskLevel).toBe('low');
  });

  test('fast_path_miss_pattern uses applyMode config', () => {
    const proposal = generateOne(makePattern({ type: 'fast_path_miss_pattern', currentValue: 0.22 }));
    expect(proposal.applyMode).toBe('config');
  });

  test('fast_path_miss_pattern uses the requested evalPlan', () => {
    const proposal = generateOne(makePattern({ type: 'fast_path_miss_pattern', currentValue: 0.22 }));
    expect(proposal.evalPlan).toEqual(['fast_path', 'memory_recall']);
  });

  test('fast_path_miss_pattern summary includes currentValue', () => {
    const proposal = generateOne(makePattern({ type: 'fast_path_miss_pattern', currentValue: 0.22 }));
    expect(proposal.summary).toContain('0.22');
  });

  test('llm_fallback_pattern generates system_intent_pattern', () => {
    const proposal = generateOne(makePattern({ type: 'llm_fallback_pattern', occurrenceCount: 7 }));
    expect(proposal.category).toBe('system_intent_pattern');
  });

  test('llm_fallback_pattern uses medium riskLevel', () => {
    const proposal = generateOne(makePattern({ type: 'llm_fallback_pattern', occurrenceCount: 7 }));
    expect(proposal.riskLevel).toBe('medium');
  });

  test('llm_fallback_pattern is forced to patch_only', () => {
    const proposal = generateOne(makePattern({ type: 'llm_fallback_pattern', occurrenceCount: 7 }));
    expect(proposal.applyMode).toBe('patch_only');
  });

  test('llm_fallback_pattern uses the requested evalPlan', () => {
    const proposal = generateOne(makePattern({ type: 'llm_fallback_pattern', occurrenceCount: 7 }));
    expect(proposal.evalPlan).toEqual(['memory_recall', 'context_pack']);
  });

  test('llm_fallback_pattern summary includes occurrenceCount', () => {
    const proposal = generateOne(makePattern({ type: 'llm_fallback_pattern', occurrenceCount: 7 }));
    expect(proposal.summary).toContain('7 次');
  });

  test('capability_failure_pattern generates capability_config', () => {
    const proposal = generateOne(makePattern({ type: 'capability_failure_pattern', capabilityId: 'shell_exec', failureRate: 0.61 }));
    expect(proposal.category).toBe('capability_config');
  });

  test('capability_failure_pattern can use applyMode config', () => {
    const proposal = generateOne(makePattern({ type: 'capability_failure_pattern', capabilityId: 'shell_exec', failureRate: 0.61 }));
    expect(proposal.applyMode).toBe('config');
  });

  test('capability_failure_pattern defaults unknown capability in summary', () => {
    const proposal = generateOne(makePattern({ type: 'capability_failure_pattern', failureRate: 0.61 }));
    expect(proposal.summary).toContain('unknown');
  });

  test('capability_failure_pattern uses memory_recall evalPlan', () => {
    const proposal = generateOne(makePattern({ type: 'capability_failure_pattern', capabilityId: 'shell_exec', failureRate: 0.61 }));
    expect(proposal.evalPlan).toEqual(['memory_recall']);
  });

  test('benchmark_regression generates benchmark_threshold', () => {
    const proposal = generateOne(makePattern({
      type: 'benchmark_regression',
      metricName: 'hit_rate',
      currentValue: 0.19,
      baselineValue: 0.37
    }));
    expect(proposal.category).toBe('benchmark_threshold');
  });

  test('benchmark_regression uses high riskLevel', () => {
    const proposal = generateOne(makePattern({
      type: 'benchmark_regression',
      metricName: 'hit_rate',
      currentValue: 0.19,
      baselineValue: 0.37
    }));
    expect(proposal.riskLevel).toBe('high');
  });

  test('benchmark_regression is forced to patch_only', () => {
    const proposal = generateOne(makePattern({
      type: 'benchmark_regression',
      metricName: 'hit_rate',
      currentValue: 0.19,
      baselineValue: 0.37
    }));
    expect(proposal.applyMode).toBe('patch_only');
  });

  test('benchmark_regression uses the requested evalPlan', () => {
    const proposal = generateOne(makePattern({
      type: 'benchmark_regression',
      metricName: 'hit_rate',
      currentValue: 0.19,
      baselineValue: 0.37
    }));
    expect(proposal.evalPlan).toEqual(['memory_recall', 'fast_path', 'context_pack']);
  });

  test('benchmark_regression summary includes current and baseline', () => {
    const proposal = generateOne(makePattern({
      type: 'benchmark_regression',
      metricName: 'hit_rate',
      currentValue: 0.19,
      baselineValue: 0.37
    }));
    expect(proposal.summary).toContain('current: 0.19, baseline: 0.37');
  });

  test('flip_flop_supersede generates memory_promotion', () => {
    const proposal = generateOne(makePattern({ type: 'flip_flop_supersede', factId: 'fact-1', occurrenceCount: 4 }));
    expect(proposal.category).toBe('memory_promotion');
  });

  test('memory_promotion uses low riskLevel', () => {
    const proposal = generateOne(makePattern({ type: 'flip_flop_supersede', factId: 'fact-1', occurrenceCount: 4 }));
    expect(proposal.riskLevel).toBe('low');
  });

  test('memory_promotion uses applyMode config', () => {
    const proposal = generateOne(makePattern({ type: 'flip_flop_supersede', factId: 'fact-1', occurrenceCount: 4 }));
    expect(proposal.applyMode).toBe('config');
  });

  test('repeated_decay_after_promote generates skill_recovery', () => {
    const proposal = generateOne(makePattern({ type: 'repeated_decay_after_promote', factId: 'fact-2', occurrenceCount: 5 }));
    expect(proposal.category).toBe('skill_recovery');
  });

  test('skill_recovery keeps a non-empty evalPlan', () => {
    const proposal = generateOne(makePattern({ type: 'repeated_decay_after_promote', factId: 'fact-2', occurrenceCount: 5 }));
    expect(proposal.evalPlan?.length).toBeGreaterThan(0);
  });

  test('risk_rule proposals stay patch_only even if the branch returns config', () => {
    const proposal = generateWithOverriddenApplyMode(
      makePattern({ type: 'repeated_approval_reject', capabilityId: 'shell_exec' }),
      'config'
    );
    expect(proposal.category).toBe('risk_rule');
    expect(proposal.applyMode).toBe('patch_only');
  });

  test('observation_filter proposals stay patch_only even if the branch returns config', () => {
    const proposal = generateWithOverriddenApplyMode(
      makePattern({ type: 'repeated_url_filter', url: 'https://blocked.example' }),
      'config'
    );
    expect(proposal.category).toBe('observation_filter');
    expect(proposal.applyMode).toBe('patch_only');
  });

  test('system_intent_pattern proposals stay patch_only even if the branch returns config', () => {
    const proposal = generateWithOverriddenApplyMode(
      makePattern({ type: 'llm_fallback_pattern', occurrenceCount: 5 }),
      'config'
    );
    expect(proposal.category).toBe('system_intent_pattern');
    expect(proposal.applyMode).toBe('patch_only');
  });

  test('evalPlan falls back to memory_recall when the branch omits it', () => {
    const generator = new PolicyProposalGenerator() as any;
    const originalBuildBase = generator.buildBase.bind(generator);
    generator.buildBase = (pattern: ObservationPattern) => {
      const base = originalBuildBase(pattern);
      return { ...base, evalPlan: [] };
    };

    const proposal = generator.generate([makePattern({ type: 'capability_failure_pattern', failureRate: 0.41 })])[0]!;

    expect(proposal.evalPlan).toEqual(['memory_recall']);
  });

  test('generator keeps evidence ids intact for new proposals', () => {
    const proposal = generateOne(makePattern({
      type: 'benchmark_regression',
      metricName: 'hit_rate',
      currentValue: 0.19,
      baselineValue: 0.37,
      evidenceEventIds: ['evt-a', 'evt-b', 'evt-c']
    }));
    expect(proposal.evidence.map((item) => item.traceEventId)).toEqual(['evt-a', 'evt-b', 'evt-c']);
  });

  test('save and get round-trip new proposal fields', () => {
    const ledger = makeLedger();
    const proposal = makeProposal({
      id: 'roundtrip',
      category: 'benchmark_threshold',
      evalPlan: ['memory_recall', 'fast_path', 'context_pack'],
      riskLevel: 'high',
      applyMode: 'patch_only'
    });

    ledger.save(proposal);

    expect(ledger.get('roundtrip')).toEqual(proposal);
  });

  test('list returns evalPlan as a deserialized array', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({
      id: 'list-1',
      proposedAt: 1,
      evalPlan: ['memory_recall', 'fast_path'],
      riskLevel: 'low',
      applyMode: 'config'
    }));
    ledger.save(makeProposal({
      id: 'list-2',
      proposedAt: 2,
      evalPlan: ['context_pack'],
      riskLevel: 'medium',
      applyMode: 'patch_only'
    }));

    const proposals = ledger.list();

    expect(proposals[0]?.evalPlan).toEqual(['context_pack']);
    expect(proposals[1]?.evalPlan).toEqual(['memory_recall', 'fast_path']);
    expect(Array.isArray(proposals[0]?.evalPlan)).toBe(true);
  });

  test('save writes default evalPlan when the proposal omits it', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'default-eval-plan', evalPlan: undefined }));
    expect(ledger.get('default-eval-plan')?.evalPlan).toEqual(['memory_recall']);
  });

  test('save writes default riskLevel when the proposal omits it', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'default-risk', riskLevel: undefined }));
    expect(ledger.get('default-risk')?.riskLevel).toBe('medium');
  });

  test('save writes default applyMode when the proposal omits it', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'default-apply', applyMode: undefined }));
    expect(ledger.get('default-apply')?.applyMode).toBe('patch_only');
  });

  test('existing rows without new fields read back with defaults', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE meta_proposals (
        id TEXT PRIMARY KEY,
        proposed_at INTEGER NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence TEXT NOT NULL,
        suggested_change TEXT NOT NULL,
        status TEXT NOT NULL,
        eval_report TEXT,
        applied_at INTEGER,
        rejected_at INTEGER
      );
    `);
    db.prepare(`
      INSERT INTO meta_proposals (
        id,
        proposed_at,
        category,
        summary,
        evidence,
        suggested_change,
        status,
        eval_report,
        applied_at,
        rejected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'legacy-1',
      10,
      'risk_rule',
      'legacy proposal',
      JSON.stringify([{ traceEventId: 'evt-1', note: 'legacy' }]),
      JSON.stringify({ action: 'legacy' }),
      'pending',
      null,
      null,
      null
    );

    const ledger = new ProposalLedger(db);
    ledger.initSchema();
    const proposal = ledger.get('legacy-1');

    expect(proposal?.evalPlan).toEqual(['memory_recall']);
    expect(proposal?.riskLevel).toBe('medium');
    expect(proposal?.applyMode).toBe('patch_only');
  });

  test('migration adds new columns to an existing meta_proposals table', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE meta_proposals (
        id TEXT PRIMARY KEY,
        proposed_at INTEGER NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence TEXT NOT NULL,
        suggested_change TEXT NOT NULL,
        status TEXT NOT NULL,
        eval_report TEXT,
        applied_at INTEGER,
        rejected_at INTEGER
      );
    `);

    const ledger = new ProposalLedger(db);
    ledger.initSchema();

    const columns = db.prepare('PRAGMA table_info(meta_proposals)').all() as Array<{ name: string }>;
    const columnNames = columns.map((column) => column.name);
    // initSchema() adds the v0.9 columns via ALTER TABLE on existing tables
    expect(columnNames).toContain('eval_plan');
    expect(columnNames).toContain('risk_level');
    expect(columnNames).toContain('apply_mode');
    expect(columnNames).toContain('approved_at');
    expect(columnNames).toContain('rolled_back_at');
    expect(columnNames).toContain('previous_value');
  });

  test('migration stays idempotent when initSchema runs twice', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE meta_proposals (
        id TEXT PRIMARY KEY,
        proposed_at INTEGER NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence TEXT NOT NULL,
        suggested_change TEXT NOT NULL,
        status TEXT NOT NULL,
        eval_report TEXT,
        applied_at INTEGER,
        rejected_at INTEGER
      );
    `);

    const ledger = new ProposalLedger(db);
    ledger.initSchema();
    ledger.initSchema();

    const columns = db.prepare('PRAGMA table_info(meta_proposals)').all() as Array<{ name: string }>;
    expect(columns.filter((column) => column.name === 'eval_plan')).toHaveLength(1);
    expect(columns.filter((column) => column.name === 'risk_level')).toHaveLength(1);
    expect(columns.filter((column) => column.name === 'apply_mode')).toHaveLength(1);
  });

  test('migration preserves legacy rows and allows saving new fields afterward', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE meta_proposals (
        id TEXT PRIMARY KEY,
        proposed_at INTEGER NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence TEXT NOT NULL,
        suggested_change TEXT NOT NULL,
        status TEXT NOT NULL,
        eval_report TEXT,
        applied_at INTEGER,
        rejected_at INTEGER
      );
    `);
    db.prepare(`
      INSERT INTO meta_proposals (
        id,
        proposed_at,
        category,
        summary,
        evidence,
        suggested_change,
        status,
        eval_report,
        applied_at,
        rejected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'legacy-2',
      20,
      'observation_filter',
      'legacy filter',
      JSON.stringify([{ traceEventId: 'evt-2', note: 'legacy row' }]),
      JSON.stringify({ url: 'https://legacy.example' }),
      'pending',
      null,
      null,
      null
    );

    const ledger = new ProposalLedger(db);
    ledger.initSchema();
    ledger.save(makeProposal({
      id: 'new-1',
      category: 'workspace_preference',
      evalPlan: ['memory_recall', 'session_continuity'],
      riskLevel: 'low',
      applyMode: 'config'
    }));

    expect(ledger.get('legacy-2')?.applyMode).toBe('patch_only');
    expect(ledger.get('new-1')?.applyMode).toBe('config');
  });

  test('list filter by category still works with the new schema columns', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'cat-1', category: 'workspace_preference' }));
    ledger.save(makeProposal({ id: 'cat-2', category: 'capability_config' }));

    expect(ledger.list({ category: 'workspace_preference' }).map((proposal) => proposal.id)).toEqual(['cat-1']);
  });

  test('list filter by status still works with the new schema columns', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'status-1', status: 'pending' }));
    ledger.save(makeProposal({ id: 'status-2', status: 'failed_eval' }));

    expect(ledger.list({ status: 'failed_eval' }).map((proposal) => proposal.id)).toEqual(['status-2']);
  });

  test('all six new categories are reachable from observation patterns', () => {
    const categories = new Set<ProposalCategory>([
      generateOne(makePattern({ type: 'fast_path_miss_pattern', currentValue: 0.2 })).category,
      generateOne(makePattern({ type: 'llm_fallback_pattern', occurrenceCount: 5 })).category,
      generateOne(makePattern({ type: 'capability_failure_pattern', capabilityId: 'shell_exec', failureRate: 0.7 })).category,
      generateOne(makePattern({ type: 'benchmark_regression', metricName: 'hit_rate', currentValue: 0.2, baselineValue: 0.37 })).category,
      generateOne(makePattern({ type: 'flip_flop_supersede', factId: 'fact-10' })).category,
      generateOne(makePattern({ type: 'repeated_decay_after_promote', factId: 'fact-11' })).category
    ]);

    expect([...categories].sort()).toEqual([
      'benchmark_threshold',
      'capability_config',
      'context_pack_policy',
      'memory_promotion',
      'skill_recovery',
      'system_intent_pattern'
    ]);
  });
});

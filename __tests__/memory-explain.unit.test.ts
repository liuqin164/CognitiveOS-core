import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'crypto';
import { FactStore } from '../src/store/FactStore.js';
import { CredibilityScorer } from '../src/governance/CredibilityScorer.js';
import { DecayPolicy } from '../src/governance/DecayPolicy.js';
import { MemoryExplain } from '../src/governance/MemoryExplain.js';
import { SupersedeChain } from '../src/governance/SupersedeChain.js';

const createdDbPaths = new Set<string>();

function makeDbPath(): string {
  const path = `/tmp/agent-brain-memory-explain-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  createdDbPaths.add(path);
  return path;
}

afterEach(() => {
  for (const dbPath of createdDbPaths) {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    createdDbPaths.delete(dbPath);
  }
});

describe('MemoryExplain', () => {
  it('explainRecall returns credibilityScore and reason for included facts', () => {
    const dbPath = makeDbPath();
    const factStore = new FactStore(dbPath);
    const explain = new MemoryExplain(factStore.getDatabase(), new CredibilityScorer(), new DecayPolicy());

    const result = explain.explainRecall({
      query: '耳机问题',
      recalled: [{ factId: 'fact-1', content: 'device | has_issue | 断连', sourceType: 'user_direct', lastAccessedAt: Date.now() }],
      excluded: []
    });

    expect(result.included).toHaveLength(1);
    expect(result.included[0]?.credibilityScore).toBe(1);
    expect(result.included[0]?.reason).toContain('passed governance filters');

    factStore.close();
  });

  it('explainRecall returns excluded reasons for decayed and superseded facts', () => {
    const dbPath = makeDbPath();
    const factStore = new FactStore(dbPath);
    const explain = new MemoryExplain(factStore.getDatabase(), new CredibilityScorer(), new DecayPolicy());

    const result = explain.explainRecall({
      query: '耳机问题',
      recalled: [],
      excluded: [
        { factId: 'fact-decayed', content: 'old', reason: 'decayed' },
        { factId: 'fact-superseded', content: 'older', reason: 'superseded' }
      ]
    });

    expect(result.excluded).toEqual([
      { factId: 'fact-decayed', reason: 'decayed' },
      { factId: 'fact-superseded', reason: 'superseded' }
    ]);

    factStore.close();
  });

  it('explainFact returns status consistent with SupersedeChain', () => {
    const dbPath = makeDbPath();
    const factStore = new FactStore(dbPath);
    const chain = new SupersedeChain(factStore.getDatabase());
    const createdAt = Date.UTC(2026, 3, 20, 12, 0, 0);
    const inserted = factStore.insertFacts([{
      neuronId: `neuron-${randomUUID()}`,
      subject: 'device',
      predicateFamily: 'has_issue',
      predicateValue: '断连',
      object: '耳机',
      validFrom: createdAt,
      certaintyLevel: 'certain',
      confidence: 0.9,
      status: 'provisional',
      sourceText: '耳机左耳断连',
      metadata: { sourceType: 'user_direct', evidenceCount: 2 }
    }])[0]!;
    chain.markPending(inserted.factId);
    chain.touchAccess(inserted.factId, createdAt + 1000);
    const explain = new MemoryExplain(factStore.getDatabase(), new CredibilityScorer(), new DecayPolicy());

    const result = explain.explainFact(inserted.factId);

    expect(result?.status).toBe('contradiction_pending');
    expect(result?.supersedeChain[0]?.factId).toBe(inserted.factId);
    expect(result?.sourceType).toBe('user_direct');

    factStore.close();
  });

  it('explainFact returns null for unknown factId', () => {
    const dbPath = makeDbPath();
    const factStore = new FactStore(dbPath);
    const explain = new MemoryExplain(factStore.getDatabase(), new CredibilityScorer(), new DecayPolicy());

    expect(explain.explainFact('missing-fact')).toBeNull();

    factStore.close();
  });

  it('explainFact returns current weight and credibilityScore', () => {
    const dbPath = makeDbPath();
    const factStore = new FactStore(dbPath);
    const chain = new SupersedeChain(factStore.getDatabase());
    const now = Date.now();
    const inserted = factStore.insertFacts([{
      neuronId: `neuron-${randomUUID()}`,
      subject: 'user',
      predicateFamily: 'worked_on',
      predicateValue: 'owned',
      object: 'Atlas',
      validFrom: now - 10_000,
      certaintyLevel: 'certain',
      confidence: 0.9,
      status: 'provisional',
      sourceText: '我做过 Atlas项目',
      metadata: { sourceType: 'user_direct', evidenceCount: 1 }
    }])[0]!;
    chain.markCanonical(inserted.factId);
    chain.touchAccess(inserted.factId, now);
    const explain = new MemoryExplain(factStore.getDatabase(), new CredibilityScorer(), new DecayPolicy());

    const result = explain.explainFact(inserted.factId);

    expect(result?.credibilityScore).toBeGreaterThan(0.9);
    expect(result?.currentWeight).toBe(1);

    factStore.close();
  });
});

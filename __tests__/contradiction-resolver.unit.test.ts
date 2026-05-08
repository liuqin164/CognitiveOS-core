import { describe, expect, it } from 'bun:test';
import { ContradictionResolver } from '../src/governance/ContradictionResolver.js';
import { CredibilityScorer } from '../src/governance/CredibilityScorer.js';

describe('ContradictionResolver', () => {
  const resolver = new ContradictionResolver(new CredibilityScorer());
  const now = Date.UTC(2026, 3, 25, 12, 0, 0);

  it('returns new_wins when new fact has higher credibility', () => {
    const verdict = resolver.resolve({
      newFact: { sourceType: 'user_direct', evidenceCount: 1, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'shell_exec_output', evidenceCount: 1, createdAt: now - 1000, predicateValue: 'old' }
    });

    expect(verdict).toBe('new_wins');
  });

  it('returns old_wins when existing fact has higher credibility', () => {
    const verdict = resolver.resolve({
      newFact: { sourceType: 'shell_exec_output', evidenceCount: 1, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'user_direct', evidenceCount: 1, createdAt: now - 1000, predicateValue: 'old' }
    });

    expect(verdict).toBe('old_wins');
  });

  it('returns contradiction_pending when scores are within 0.05', () => {
    const verdict = resolver.resolve({
      newFact: { sourceType: 'web_fetch_general', evidenceCount: 2, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'web_fetch_general', evidenceCount: 2, createdAt: now - 1000, predicateValue: 'old' }
    });

    expect(verdict).toBe('contradiction_pending');
  });

  it('uses recency_wins strategy when requested', () => {
    const verdict = resolver.resolve({
      strategy: 'recency_wins',
      newFact: { sourceType: 'shell_exec_output', evidenceCount: 0, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'user_direct', evidenceCount: 10, createdAt: now - 10_000, predicateValue: 'old' }
    });

    expect(verdict).toBe('new_wins');
  });

  it('uses evidence_wins strategy when requested', () => {
    const verdict = resolver.resolve({
      strategy: 'evidence_wins',
      newFact: { sourceType: 'shell_exec_output', evidenceCount: 10, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'user_direct', evidenceCount: 1, createdAt: now - 1000, predicateValue: 'old' }
    });

    expect(verdict).toBe('new_wins');
  });

  it('prefers user_direct over shell_exec_output', () => {
    const verdict = resolver.resolve({
      newFact: { sourceType: 'user_direct', evidenceCount: 0, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'shell_exec_output', evidenceCount: 10, createdAt: now - 1000, predicateValue: 'old' }
    });

    expect(verdict).toBe('new_wins');
  });

  it('returns contradiction_pending on equal timestamps under recency_wins', () => {
    const verdict = resolver.resolve({
      strategy: 'recency_wins',
      newFact: { sourceType: 'user_direct', evidenceCount: 0, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'shell_exec_output', evidenceCount: 0, createdAt: now, predicateValue: 'old' }
    });

    expect(verdict).toBe('contradiction_pending');
  });

  it('returns contradiction_pending on equal evidence under evidence_wins', () => {
    const verdict = resolver.resolve({
      strategy: 'evidence_wins',
      newFact: { sourceType: 'user_direct', evidenceCount: 3, createdAt: now, predicateValue: 'new' },
      existingFact: { sourceType: 'shell_exec_output', evidenceCount: 3, createdAt: now - 1000, predicateValue: 'old' }
    });

    expect(verdict).toBe('contradiction_pending');
  });
});

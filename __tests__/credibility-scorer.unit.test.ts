import { describe, expect, it } from 'bun:test';
import { CredibilityScorer } from '../src/governance/CredibilityScorer.js';

describe('CredibilityScorer', () => {
  const scorer = new CredibilityScorer();

  it('returns 1.0 for user_direct', () => {
    expect(scorer.score('user_direct')).toBe(1.0);
  });

  it('returns 0.30 for shell_exec_output', () => {
    expect(scorer.score('shell_exec_output')).toBe(0.3);
  });

  it('returns 0.5 for unknown sourceType', () => {
    expect(scorer.score('unknown_source')).toBe(0.5);
  });

  it('caps evidence multiplier at 1.5 when evidenceCount is 10', () => {
    const score = scorer.scoreForFact({
      sourceType: 'user_direct',
      evidenceCount: 10,
      recencyMs: 60 * 1000
    });

    expect(score).toBe(1.5);
  });

  it('uses a recency factor of 1.0 within one day', () => {
    const score = scorer.scoreForFact({
      sourceType: 'web_fetch_official',
      evidenceCount: 0,
      recencyMs: 23 * 60 * 60 * 1000
    });

    expect(score).toBe(0.7);
  });

  it('uses a recency factor of 0.70 after 30 days', () => {
    const score = scorer.scoreForFact({
      sourceType: 'web_fetch_official',
      evidenceCount: 0,
      recencyMs: 31 * 24 * 60 * 60 * 1000
    });

    expect(score).toBeCloseTo(0.49, 6);
  });

  it('combines base credibility, evidence and recency factors', () => {
    const score = scorer.scoreForFact({
      sourceType: 'file_read',
      evidenceCount: 4,
      recencyMs: 10 * 24 * 60 * 60 * 1000
    });

    expect(score).toBeCloseTo(0.6 * 1.2 * 0.85, 6);
  });
});

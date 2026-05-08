import { describe, expect, it } from 'bun:test';
import { DecayPolicy } from '../src/governance/DecayPolicy.js';

describe('DecayPolicy', () => {
  const now = Date.UTC(2026, 3, 25, 12, 0, 0);
  const day = 24 * 60 * 60 * 1000;

  it('keeps base weight at day 0', () => {
    const policy = new DecayPolicy();
    expect(policy.computeWeight({ lastAccessedAt: now, now })).toBe(1.0);
  });

  it('decays to 0.8 after 30 days', () => {
    const policy = new DecayPolicy();
    expect(policy.computeWeight({ lastAccessedAt: now - 30 * day, now })).toBeCloseTo(0.8, 6);
  });

  it('decays to 0.64 after 60 days', () => {
    const policy = new DecayPolicy();
    expect(policy.computeWeight({ lastAccessedAt: now - 60 * day, now })).toBeCloseTo(0.64, 6);
  });

  it('decays to 0.512 after 90 days', () => {
    const policy = new DecayPolicy();
    expect(policy.computeWeight({ lastAccessedAt: now - 90 * day, now })).toBeCloseTo(0.512, 6);
  });

  it('excludes weights below minWeight', () => {
    const policy = new DecayPolicy();
    expect(policy.isExcluded(0.09)).toBe(true);
  });

  it('does not exclude weights at minWeight', () => {
    const policy = new DecayPolicy();
    expect(policy.isExcluded(0.1)).toBe(false);
  });

  it('respects custom decayFactor and decayThresholdDays', () => {
    const policy = new DecayPolicy({ decayFactor: 0.5, decayThresholdDays: 10 });
    expect(policy.computeWeight({ lastAccessedAt: now - 20 * day, now })).toBeCloseTo(0.25, 6);
  });
});

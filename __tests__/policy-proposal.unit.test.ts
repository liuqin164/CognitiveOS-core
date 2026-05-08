import { describe, expect, it } from 'bun:test';
import { PolicyProposalGenerator } from '../src/meta/PolicyProposalGenerator.js';
import type { ObservationPattern } from '../src/meta/types.js';

function makePattern(overrides: Partial<ObservationPattern> & Pick<ObservationPattern, 'type'>): ObservationPattern {
  return {
    occurrenceCount: overrides.occurrenceCount ?? 3,
    evidenceEventIds: overrides.evidenceEventIds ?? ['evt-1', 'evt-2', 'evt-3'],
    capabilityId: overrides.capabilityId,
    url: overrides.url,
    factId: overrides.factId,
    type: overrides.type
  };
}

describe('PolicyProposalGenerator', () => {
  it('maps repeated_approval_reject to risk_rule', () => {
    const proposal = new PolicyProposalGenerator().generate([
      makePattern({ type: 'repeated_approval_reject', capabilityId: 'shell_exec' })
    ])[0]!;

    expect(proposal.category).toBe('risk_rule');
    expect(proposal.suggestedChange).toEqual({
      capabilityId: 'shell_exec',
      suggestRiskLevel: 'high',
      currentOccurrences: 3
    });
  });

  it('maps repeated_url_filter to observation_filter with blocklist action', () => {
    const proposal = new PolicyProposalGenerator().generate([
      makePattern({ type: 'repeated_url_filter', url: 'https://example.com' })
    ])[0]!;

    expect(proposal.category).toBe('observation_filter');
    expect(proposal.suggestedChange.action).toBe('blocklist');
  });

  it('maps flip_flop_supersede to memory_promotion', () => {
    const proposal = new PolicyProposalGenerator().generate([
      makePattern({ type: 'flip_flop_supersede', factId: 'fact-1' })
    ])[0]!;

    expect(proposal.category).toBe('memory_promotion');
    expect(proposal.suggestedChange.action).toBe('mark_needs_llm_review');
  });

  it('copies evidenceEventIds into proposal evidence', () => {
    const proposal = new PolicyProposalGenerator().generate([
      makePattern({ type: 'repeated_decay_after_promote', factId: 'fact-2', evidenceEventIds: ['a', 'b'] })
    ])[0]!;

    expect(proposal.evidence.map((item) => item.traceEventId)).toEqual(['a', 'b']);
  });

  it('starts every generated proposal in pending status', () => {
    const proposals = new PolicyProposalGenerator().generate([
      makePattern({ type: 'repeated_approval_reject', capabilityId: 'git_push' }),
      makePattern({ type: 'repeated_url_filter', url: 'https://blocked.example' })
    ]);

    expect(proposals.every((proposal) => proposal.status === 'pending')).toBe(true);
  });

  it('generates unique ids for proposals in the same batch', () => {
    const proposals = new PolicyProposalGenerator().generate([
      makePattern({ type: 'repeated_approval_reject', capabilityId: 'git_push' }),
      makePattern({ type: 'repeated_url_filter', url: 'https://blocked.example' })
    ]);

    expect(new Set(proposals.map((proposal) => proposal.id)).size).toBe(2);
  });
});

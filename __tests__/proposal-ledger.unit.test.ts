import { describe, expect, it } from 'bun:test';
import Database from 'bun:sqlite';
import { ProposalLedger } from '../src/meta/ProposalLedger.js';
import type { PolicyProposal } from '../src/meta/types.js';

function makeLedger(): ProposalLedger {
  const ledger = new ProposalLedger(new Database(':memory:'));
  ledger.initSchema();
  return ledger;
}

function makeProposal(overrides: Partial<PolicyProposal> = {}): PolicyProposal {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    proposedAt: overrides.proposedAt ?? Date.now(),
    category: overrides.category ?? 'risk_rule',
    summary: overrides.summary ?? 'proposal summary',
    evidence: overrides.evidence ?? [{ traceEventId: 'evt-1', note: 'evidence #1' }],
    suggestedChange: overrides.suggestedChange ?? { capabilityId: 'shell_exec', suggestRiskLevel: 'high' },
    status: overrides.status ?? 'pending',
    evalReport: overrides.evalReport,
    appliedAt: overrides.appliedAt,
    rejectedAt: overrides.rejectedAt,
    evalPlan: overrides.evalPlan ?? ['memory_recall'],
    riskLevel: overrides.riskLevel ?? 'medium',
    applyMode: overrides.applyMode ?? 'patch_only'
  };
}

describe('ProposalLedger', () => {
  it('round-trips a saved proposal through get()', () => {
    const ledger = makeLedger();
    const proposal = makeProposal();
    ledger.save(proposal);

    expect(ledger.get(proposal.id)).toEqual(proposal);
  });

  it('list without filters returns all proposals', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'a', proposedAt: 1 }));
    ledger.save(makeProposal({ id: 'b', proposedAt: 2 }));

    expect(ledger.list().map((proposal) => proposal.id)).toEqual(['b', 'a']);
  });

  it('filters by status', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'pending', status: 'pending' }));
    ledger.save(makeProposal({ id: 'failed', status: 'failed_eval' }));

    expect(ledger.list({ status: 'pending' }).map((proposal) => proposal.id)).toEqual(['pending']);
  });

  it('filters by category', () => {
    const ledger = makeLedger();
    ledger.save(makeProposal({ id: 'risk', category: 'risk_rule' }));
    ledger.save(makeProposal({ id: 'filter', category: 'observation_filter' }));

    expect(ledger.list({ category: 'risk_rule' }).map((proposal) => proposal.id)).toEqual(['risk']);
  });

  it('updateStatus writes evalReport when moving to passed_eval', () => {
    const ledger = makeLedger();
    const proposal = makeProposal({ id: 'proposal-1' });
    ledger.save(proposal);

    ledger.updateStatus(proposal.id, 'passed_eval', { evalReport: 'eval/reports/2026-04-25' });

    expect(ledger.get(proposal.id)).toMatchObject({
      status: 'passed_eval',
      evalReport: 'eval/reports/2026-04-25'
    });
  });

  it('updateStatus writes appliedAt when moving to applied', () => {
    const ledger = makeLedger();
    const proposal = makeProposal({ id: 'proposal-2', status: 'passed_eval' });
    ledger.save(proposal);

    ledger.updateStatus(proposal.id, 'applied', { appliedAt: 12345 });

    expect(ledger.get(proposal.id)).toMatchObject({
      status: 'applied',
      appliedAt: 12345
    });
  });

  it('serializes and deserializes evidence and suggestedChange json', () => {
    const ledger = makeLedger();
    const proposal = makeProposal({
      id: 'json-roundtrip',
      evidence: [
        { traceEventId: 'evt-1', note: 'first' },
        { traceEventId: 'evt-2', note: 'second' }
      ],
      suggestedChange: {
        url: 'https://example.com',
        action: 'blocklist',
        currentOccurrences: 4
      }
    });

    ledger.save(proposal);

    expect(ledger.get(proposal.id)?.evidence).toEqual(proposal.evidence);
    expect(ledger.get(proposal.id)?.suggestedChange).toEqual(proposal.suggestedChange);
  });
});

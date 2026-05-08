import type { ProposalLedger } from '../meta/ProposalLedger.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';

const PROPOSAL_STATUSES = [
  'pending',
  'under_eval',
  'passed_eval',
  'failed_eval',
  'approved',
  'applied',
  'rolled_back',
  'rejected'
] as const;

export class ProposalBoard implements Board {
  readonly id = 'proposals';
  readonly description = 'Read-only view of proposal lifecycle and status';
  readonly eventBus: BoardEventBus;

  constructor(
    private readonly ledger: ProposalLedger,
    eventBus?: BoardEventBus
  ) {
    this.eventBus = eventBus ?? new BoardEventBus();
  }

  async snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot> {
    const all = this.ledger.list();
    const byStatus = Object.fromEntries(
      PROPOSAL_STATUSES.map((status) => [status, all.filter((proposal) => proposal.status === status).length])
    );

    return {
      boardId: this.id,
      capturedAt: Date.now(),
      data: {
        totalProposals: all.length,
        byStatus,
        recent: all.slice(0, 10)
      }
    };
  }

  stream(callback: (event: BoardEvent) => void): () => void {
    return this.eventBus.subscribe({ boardId: this.id }, callback);
  }
}

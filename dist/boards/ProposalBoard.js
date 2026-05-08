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
];
export class ProposalBoard {
    ledger;
    id = 'proposals';
    description = 'Read-only view of proposal lifecycle and status';
    eventBus;
    constructor(ledger, eventBus) {
        this.ledger = ledger;
        this.eventBus = eventBus ?? new BoardEventBus();
    }
    async snapshot(_options) {
        const all = this.ledger.list();
        const byStatus = Object.fromEntries(PROPOSAL_STATUSES.map((status) => [status, all.filter((proposal) => proposal.status === status).length]));
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
    stream(callback) {
        return this.eventBus.subscribe({ boardId: this.id }, callback);
    }
}

import type { ProposalLedger } from '../meta/ProposalLedger.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';
export declare class ProposalBoard implements Board {
    private readonly ledger;
    readonly id = "proposals";
    readonly description = "Read-only view of proposal lifecycle and status";
    readonly eventBus: BoardEventBus;
    constructor(ledger: ProposalLedger, eventBus?: BoardEventBus);
    snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
    stream(callback: (event: BoardEvent) => void): () => void;
}
//# sourceMappingURL=ProposalBoard.d.ts.map
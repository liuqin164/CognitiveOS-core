import type Database from 'bun:sqlite';
export interface SupersedeRecord {
    factId: string;
    supersededBy?: string;
    status: 'canonical' | 'superseded' | 'candidate_fact' | 'contradiction_pending';
    resolvedAt?: number;
}
export declare class SupersedeChain {
    private db;
    constructor(db: Database);
    initSchema(): void;
    markCanonical(factId: string): void;
    markSuperseded(factId: string, supersededBy: string): void;
    markCandidate(factId: string): void;
    markPending(factId: string): void;
    getChain(factId: string): SupersedeRecord[];
    getStatus(factId: string): SupersedeRecord | null;
    touchAccess(factId: string, accessedAt?: number): void;
    getLastAccessedAt(factId: string): number | undefined;
}
//# sourceMappingURL=SupersedeChain.d.ts.map
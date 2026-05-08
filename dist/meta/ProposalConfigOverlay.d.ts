export interface OverlayEntry {
    key: string;
    value: unknown;
}
export declare class ProposalConfigOverlay {
    private store;
    set(key: string, value: unknown): void;
    get(key: string): unknown;
    entries(): OverlayEntry[];
    clear(): void;
    withOverlay<T>(entries: OverlayEntry[], fn: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=ProposalConfigOverlay.d.ts.map
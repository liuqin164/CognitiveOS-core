export type CompactableNeuronStatus = 'cold' | 'suspect' | 'archived';
export interface StorageCompactionInput {
    dbPath: string;
    dryRun: boolean;
    statuses?: CompactableNeuronStatus[];
    projectId?: string;
    dimension?: number;
}
export interface StorageCompactionResult {
    dbPath: string;
    dryRun: boolean;
    statuses: CompactableNeuronStatus[];
    projectId?: string;
    dimension?: number;
    rawEventsBefore: number;
    rawEventsAfter: number;
    rawEventsDeleted: number;
    vectorCountBefore: number;
    vectorCountAfter: number;
    vectorBytesBefore: number;
    vectorBytesAfter: number;
    eligibleVectorCount: number;
    eligibleVectorBytes: number;
    vectorsDeleted: number;
    vectorBytesDeleted: number;
    vectorBytesPerRawEventBefore: number;
    vectorBytesPerRawEventAfter: number;
}
export declare function compactStorage(input: StorageCompactionInput): StorageCompactionResult;
//# sourceMappingURL=StorageCompactor.d.ts.map
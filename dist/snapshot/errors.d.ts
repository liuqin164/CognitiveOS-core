export declare class SnapshotVersionError extends Error {
    constructor(version: unknown);
}
export declare class DimensionMismatchError extends Error {
    readonly expected: number;
    readonly actual: number;
    constructor(expected: number, actual: number);
}
export declare class ChecksumError extends Error {
    constructor();
}
export declare class KernelRunningError extends Error {
    constructor();
}
export declare class SnapshotTargetExistsError extends Error {
    constructor(targetPath: string);
}
//# sourceMappingURL=errors.d.ts.map
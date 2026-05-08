export class SnapshotVersionError extends Error {
    constructor(version) {
        super(`Unsupported memory snapshot version: ${String(version)}`);
        this.name = 'SnapshotVersionError';
    }
}
export class DimensionMismatchError extends Error {
    expected;
    actual;
    constructor(expected, actual) {
        super(`Snapshot embedding dimension mismatch: expected ${expected}, actual ${actual}`);
        this.expected = expected;
        this.actual = actual;
        this.name = 'DimensionMismatchError';
    }
}
export class ChecksumError extends Error {
    constructor() {
        super('Snapshot checksum verification failed');
        this.name = 'ChecksumError';
    }
}
export class KernelRunningError extends Error {
    constructor() {
        super('Cannot import a snapshot into a started MemoryKernel');
        this.name = 'KernelRunningError';
    }
}
export class SnapshotTargetExistsError extends Error {
    constructor(targetPath) {
        super(`Snapshot import target already exists: ${targetPath}`);
        this.name = 'SnapshotTargetExistsError';
    }
}

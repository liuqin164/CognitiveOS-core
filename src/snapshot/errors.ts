export class SnapshotVersionError extends Error {
  constructor(version: unknown) {
    super(`Unsupported memory snapshot version: ${String(version)}`);
    this.name = 'SnapshotVersionError';
  }
}

export class DimensionMismatchError extends Error {
  constructor(public readonly expected: number, public readonly actual: number) {
    super(`Snapshot embedding dimension mismatch: expected ${expected}, actual ${actual}`);
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
  constructor(targetPath: string) {
    super(`Snapshot import target already exists: ${targetPath}`);
    this.name = 'SnapshotTargetExistsError';
  }
}

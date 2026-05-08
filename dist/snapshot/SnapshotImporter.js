import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ChecksumError, DimensionMismatchError, SnapshotTargetExistsError, SnapshotVersionError } from './errors.js';
export class SnapshotImporter {
    options;
    constructor(options) {
        this.options = options;
    }
    async import(snapshotPath, targetDbPath, opts = {}) {
        const { header, dbBytes } = this.readSnapshot(snapshotPath);
        if (header.version !== 1)
            throw new SnapshotVersionError(header.version);
        if (header.embeddingDimension !== this.options.expectedEmbeddingDimension) {
            throw new DimensionMismatchError(this.options.expectedEmbeddingDimension, header.embeddingDimension);
        }
        const checksum = createHash('sha256').update(dbBytes).digest('hex');
        if (checksum !== header.checksum)
            throw new ChecksumError();
        if (opts.dryRun) {
            return { header, targetPath: targetDbPath, skipped: true };
        }
        if (existsSync(targetDbPath) && opts.overwrite !== true) {
            throw new SnapshotTargetExistsError(targetDbPath);
        }
        mkdirSync(dirname(targetDbPath), { recursive: true });
        writeFileSync(targetDbPath, dbBytes);
        return { header, targetPath: targetDbPath, skipped: false };
    }
    readSnapshot(snapshotPath) {
        const bytes = readFileSync(snapshotPath);
        if (bytes.byteLength < 5)
            throw new SnapshotVersionError('truncated');
        const headerLength = bytes.readUInt32LE(0);
        const headerStart = 4;
        const headerEnd = headerStart + headerLength;
        const header = JSON.parse(bytes.subarray(headerStart, headerEnd).toString('utf8'));
        return { header, dbBytes: bytes.subarray(headerEnd) };
    }
}

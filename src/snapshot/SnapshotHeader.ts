export interface SnapshotHeader {
  version: 1;
  schemaVersion: number;
  embeddingDimension: number;
  neuronCount: number;
  createdAt: string;
  coreVersion: string;
  checksum: string;
}

export interface SnapshotMeta {
  header: SnapshotHeader;
  snapshotPath: string;
  byteLength: number;
}

import Database from 'bun:sqlite';

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

interface VectorStats {
  count: number;
  bytes: number;
}

interface EligibleVectorRow {
  neuron_id: string;
  bytes: number;
}

export function compactStorage(input: StorageCompactionInput): StorageCompactionResult {
  const statuses: CompactableNeuronStatus[] = input.statuses && input.statuses.length > 0
    ? input.statuses
    : ['archived', 'suspect'];
  const db = new Database(input.dbPath);
  db.exec('PRAGMA busy_timeout = 5000;');
  try {
    const rawEventsBefore = getRawEventCount(db);
    const before = getVectorStats(db, input);
    const eligible = listEligibleVectors(db, input, statuses);

    if (!input.dryRun && eligible.length > 0) {
      const deleteOne = db.prepare(`DELETE FROM vector_index WHERE neuron_id = ? AND (? IS NULL OR dimensions = ?)`);
      const write = db.transaction((rows: EligibleVectorRow[]) => {
        for (const row of rows) deleteOne.run(row.neuron_id, input.dimension ?? null, input.dimension ?? null);
      });
      write(eligible);
    }

    const rawEventsAfter = getRawEventCount(db);
    const after = getVectorStats(db, input);
    const deletedCount = before.count - after.count;
    const deletedBytes = before.bytes - after.bytes;
    return {
      dbPath: input.dbPath,
      dryRun: input.dryRun,
      statuses,
      projectId: input.projectId,
      dimension: input.dimension,
      rawEventsBefore,
      rawEventsAfter,
      rawEventsDeleted: rawEventsBefore - rawEventsAfter,
      vectorCountBefore: before.count,
      vectorCountAfter: after.count,
      vectorBytesBefore: before.bytes,
      vectorBytesAfter: after.bytes,
      eligibleVectorCount: eligible.length,
      eligibleVectorBytes: eligible.reduce((sum, row) => sum + row.bytes, 0),
      vectorsDeleted: input.dryRun ? 0 : deletedCount,
      vectorBytesDeleted: input.dryRun ? 0 : deletedBytes,
      vectorBytesPerRawEventBefore: rawEventsBefore === 0 ? before.bytes : before.bytes / rawEventsBefore,
      vectorBytesPerRawEventAfter: rawEventsAfter === 0 ? after.bytes : after.bytes / rawEventsAfter,
    };
  } finally {
    db.close();
  }
}

function getRawEventCount(db: Database): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM memory_events`).get() as { count: number } | null;
  return row?.count || 0;
}

function getVectorStats(db: Database, input: Pick<StorageCompactionInput, 'dimension' | 'projectId'>): VectorStats {
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (input.dimension !== undefined) {
    conditions.push('v.dimensions = ?');
    params.push(input.dimension);
  }
  if (input.projectId) {
    conditions.push('n.project_id = ?');
    params.push(input.projectId);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(length(v.vector_blob)), 0) AS bytes
    FROM vector_index v
    LEFT JOIN neurons n ON n.id = v.neuron_id
    ${where}
  `).get(...params) as { count: number; bytes: number } | null;
  return {
    count: Number(row?.count || 0),
    bytes: Number(row?.bytes || 0),
  };
}

function listEligibleVectors(
  db: Database,
  input: Pick<StorageCompactionInput, 'dimension' | 'projectId'>,
  statuses: CompactableNeuronStatus[],
): EligibleVectorRow[] {
  const statusPlaceholders = statuses.map(() => '?').join(', ');
  const conditions = [`n.status IN (${statusPlaceholders})`];
  const params: Array<string | number> = [...statuses];
  if (input.dimension !== undefined) {
    conditions.push('v.dimensions = ?');
    params.push(input.dimension);
  }
  if (input.projectId) {
    conditions.push('n.project_id = ?');
    params.push(input.projectId);
  }
  return db.prepare(`
    SELECT v.neuron_id, length(v.vector_blob) AS bytes
    FROM vector_index v
    JOIN neurons n ON n.id = v.neuron_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY v.neuron_id ASC
  `).all(...params) as EligibleVectorRow[];
}

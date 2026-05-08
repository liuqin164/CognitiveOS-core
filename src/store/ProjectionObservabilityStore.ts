import Database from 'bun:sqlite';
import type { ProjectionObservabilityHistoryPage, ProjectionObservabilityStorageStats } from '../types/index.js';

export class ProjectionObservabilityStore {
  private db: Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projection_observability_samples (
        sample_id TEXT PRIMARY KEY,
        projection_type TEXT NOT NULL,
        projection_name TEXT NOT NULL,
        checkpoint_status TEXT NOT NULL,
        pending_events INTEGER NOT NULL,
        materialized_count INTEGER NOT NULL,
        metadata_json TEXT,
        sampled_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projection_observability_type_time
        ON projection_observability_samples(projection_type, sampled_at DESC);

      CREATE TABLE IF NOT EXISTS projection_observability_rollups (
        rollup_id TEXT PRIMARY KEY,
        projection_type TEXT NOT NULL,
        projection_name TEXT NOT NULL,
        checkpoint_status TEXT NOT NULL,
        pending_events INTEGER NOT NULL,
        materialized_count INTEGER NOT NULL,
        bucket_ms INTEGER NOT NULL,
        sample_count INTEGER NOT NULL,
        metadata_json TEXT,
        sampled_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projection_observability_rollups_type_time
        ON projection_observability_rollups(projection_type, sampled_at DESC);
    `);
  }

  insertSample(input: {
    projectionType: 'vector' | 'runtime' | 'policy';
    projectionName: string;
    checkpointStatus: 'idle' | 'building' | 'ready' | 'degraded' | 'failed';
    pendingEvents: number;
    materializedCount: number;
    sampledAt?: number;
    metadata?: Record<string, unknown>;
  }): void {
    const sampledAt = input.sampledAt ?? Date.now();
    const sampleId = `${input.projectionType}:${input.projectionName}:${sampledAt}:${Math.random().toString(36).slice(2, 8)}`;
    this.db.prepare(`
      INSERT INTO projection_observability_samples (
        sample_id, projection_type, projection_name, checkpoint_status,
        pending_events, materialized_count, metadata_json, sampled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sampleId,
      input.projectionType,
      input.projectionName,
      input.checkpointStatus,
      input.pendingEvents,
      input.materializedCount,
      input.metadata ? JSON.stringify(input.metadata) : null,
      sampledAt
    );
  }

  deleteOlderThan(cutoffTime: number): number {
    const result = this.db.prepare(`
      DELETE FROM projection_observability_samples
      WHERE sampled_at < ?
    `).run(cutoffTime);
    return Number(result.changes || 0);
  }

  compactOlderThan(cutoffTime: number, bucketMs: number = 60 * 60 * 1000): {
    insertedRollups: number;
    prunedSamples: number;
  } {
    const safeBucketMs = Math.max(60_000, bucketMs);
    const rows = this.db.prepare(`
      SELECT
        projection_type,
        projection_name,
        checkpoint_status,
        CAST(sampled_at / ? AS INTEGER) * ? AS bucket_start,
        AVG(pending_events) AS avg_pending_events,
        AVG(materialized_count) AS avg_materialized_count,
        COUNT(*) AS sample_count
      FROM projection_observability_samples
      WHERE sampled_at < ?
      GROUP BY projection_type, projection_name, checkpoint_status, bucket_start
      ORDER BY bucket_start ASC
    `).all(safeBucketMs, safeBucketMs, cutoffTime) as Array<{
      projection_type: 'vector' | 'runtime' | 'policy';
      projection_name: string;
      checkpoint_status: 'idle' | 'building' | 'ready' | 'degraded' | 'failed';
      bucket_start: number;
      avg_pending_events: number;
      avg_materialized_count: number;
      sample_count: number;
    }>;

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO projection_observability_rollups (
        rollup_id, projection_type, projection_name, checkpoint_status,
        pending_events, materialized_count, bucket_ms, sample_count, metadata_json, sampled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of rows) {
      const rollupId = [
        row.projection_type,
        row.projection_name,
        row.checkpoint_status,
        safeBucketMs,
        row.bucket_start
      ].join(':');
      insertStmt.run(
        rollupId,
        row.projection_type,
        row.projection_name,
        row.checkpoint_status,
        Math.round(row.avg_pending_events),
        Math.round(row.avg_materialized_count),
        safeBucketMs,
        row.sample_count,
        JSON.stringify({ storageTier: 'rollup' }),
        row.bucket_start
      );
    }

    const prunedSamples = this.deleteOlderThan(cutoffTime);
    return {
      insertedRollups: rows.length,
      prunedSamples
    };
  }

  compactRollupsOlderThan(
    cutoffTime: number,
    sourceBucketMs: number,
    targetBucketMs: number
  ): {
    insertedRollups: number;
    prunedRollups: number;
  } {
    if (targetBucketMs <= sourceBucketMs) {
      return { insertedRollups: 0, prunedRollups: 0 };
    }

    const rows = this.db.prepare(`
      SELECT
        projection_type,
        projection_name,
        checkpoint_status,
        CAST(sampled_at / ? AS INTEGER) * ? AS bucket_start,
        AVG(pending_events) AS avg_pending_events,
        AVG(materialized_count) AS avg_materialized_count,
        SUM(sample_count) AS sample_count
      FROM projection_observability_rollups
      WHERE sampled_at < ?
        AND bucket_ms = ?
      GROUP BY projection_type, projection_name, checkpoint_status, bucket_start
      ORDER BY bucket_start ASC
    `).all(
      targetBucketMs,
      targetBucketMs,
      cutoffTime,
      sourceBucketMs
    ) as Array<{
      projection_type: 'vector' | 'runtime' | 'policy';
      projection_name: string;
      checkpoint_status: 'idle' | 'building' | 'ready' | 'degraded' | 'failed';
      bucket_start: number;
      avg_pending_events: number;
      avg_materialized_count: number;
      sample_count: number;
    }>;

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO projection_observability_rollups (
        rollup_id, projection_type, projection_name, checkpoint_status,
        pending_events, materialized_count, bucket_ms, sample_count, metadata_json, sampled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of rows) {
      const rollupId = [
        row.projection_type,
        row.projection_name,
        row.checkpoint_status,
        targetBucketMs,
        row.bucket_start
      ].join(':');
      insertStmt.run(
        rollupId,
        row.projection_type,
        row.projection_name,
        row.checkpoint_status,
        Math.round(row.avg_pending_events),
        Math.round(row.avg_materialized_count),
        targetBucketMs,
        row.sample_count,
        JSON.stringify({ storageTier: 'rollup', sourceBucketMs }),
        row.bucket_start
      );
    }

    const deleteResult = this.db.prepare(`
      DELETE FROM projection_observability_rollups
      WHERE sampled_at < ?
        AND bucket_ms = ?
    `).run(cutoffTime, sourceBucketMs);

    return {
      insertedRollups: rows.length,
      prunedRollups: Number(deleteResult.changes || 0)
    };
  }

  getSampleCount(): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count FROM projection_observability_samples
    `).get() as { count: number } | null;
    return row?.count || 0;
  }

  getRollupCount(): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count FROM projection_observability_rollups
    `).get() as { count: number } | null;
    return row?.count || 0;
  }

  getStorageStats(): ProjectionObservabilityStorageStats {
    const bucketRows = this.db.prepare(`
      SELECT DISTINCT bucket_ms FROM projection_observability_rollups ORDER BY bucket_ms ASC
    `).all() as Array<{ bucket_ms: number }>;
    return {
      rawSampleCount: this.getSampleCount(),
      rollupCount: this.getRollupCount(),
      rollupBuckets: bucketRows.map((row) => row.bucket_ms)
    };
  }

  getHistoryPage(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      projectionType?: Array<'vector' | 'runtime' | 'policy'>;
      checkpointStatus?: Array<'idle' | 'building' | 'ready' | 'degraded' | 'failed'>;
      bucketMs?: number;
      aggregateMode?: 'latest' | 'avg';
      startTime?: number;
      endTime?: number;
      includeRollups?: boolean;
    }
  ): ProjectionObservabilityHistoryPage {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const offset = (safePage - 1) * safePageSize;
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (filters?.projectionType?.length) {
      conditions.push(`projection_type IN (${filters.projectionType.map(() => '?').join(', ')})`);
      params.push(...filters.projectionType);
    }
    if (filters?.checkpointStatus?.length) {
      conditions.push(`checkpoint_status IN (${filters.checkpointStatus.map(() => '?').join(', ')})`);
      params.push(...filters.checkpointStatus);
    }
    if (filters?.startTime !== undefined) {
      conditions.push('sampled_at >= ?');
      params.push(filters.startTime);
    }
    if (filters?.endTime !== undefined) {
      conditions.push('sampled_at <= ?');
      params.push(filters.endTime);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const bucketMs = filters?.bucketMs && filters.bucketMs > 0 ? filters.bucketMs : undefined;
    const aggregateMode = filters?.aggregateMode || 'latest';
    const useAggregation = Boolean(bucketMs);
    const includeRollups = filters?.includeRollups !== false;

    let total = 0;
    let rows: any[] = [];

    if (useAggregation) {
      const sourceSql = includeRollups
        ? `
          SELECT
            projection_type, projection_name, checkpoint_status, pending_events,
            materialized_count, sampled_at, metadata_json
          FROM projection_observability_samples
          ${where}
          UNION ALL
          SELECT
            projection_type, projection_name, checkpoint_status, pending_events,
            materialized_count, sampled_at, metadata_json
          FROM projection_observability_rollups
          ${where}
        `
        : `
          SELECT
            projection_type, projection_name, checkpoint_status, pending_events,
            materialized_count, sampled_at, metadata_json
          FROM projection_observability_samples
          ${where}
        `;
      const sourceParams = includeRollups ? [...params, ...params] : [...params];
      const bucketExpr = `CAST(sampled_at / ${bucketMs} AS INTEGER) * ${bucketMs}`;
      const totalRow = this.db.prepare(`
        SELECT COUNT(*) AS count FROM (
          SELECT projection_type, projection_name, ${bucketExpr} AS bucket_start
          FROM (${sourceSql})
          GROUP BY projection_type, projection_name, bucket_start
        )
      `).get(...sourceParams) as { count: number } | null;
      total = totalRow?.count || 0;

      rows = this.db.prepare(`
        SELECT
          projection_type,
          projection_name,
          CASE
            WHEN ? = 'avg' THEN 'ready'
            ELSE (
              SELECT s2.checkpoint_status
              FROM (${sourceSql}) s2
              WHERE s2.projection_type = s1.projection_type
                AND s2.projection_name = s1.projection_name
                AND CAST(s2.sampled_at / ${bucketMs} AS INTEGER) * ${bucketMs} = ${bucketExpr}
              ORDER BY s2.sampled_at DESC
              LIMIT 1
            )
          END AS checkpoint_status,
          CAST(AVG(pending_events) AS INTEGER) AS pending_events,
          CAST(AVG(materialized_count) AS INTEGER) AS materialized_count,
          MAX(sampled_at) AS sampled_at,
          JSON_OBJECT('storageTier', 'aggregated') AS metadata_json
        FROM (${sourceSql}) s1
        GROUP BY projection_type, projection_name, ${bucketExpr}
        ORDER BY sampled_at DESC, projection_name DESC
        LIMIT ? OFFSET ?
      `).all(aggregateMode, ...sourceParams, ...sourceParams, safePageSize, offset) as any[];
    } else {
      const sourceSql = includeRollups
        ? `
          SELECT
            projection_type, projection_name, checkpoint_status, pending_events,
            materialized_count, metadata_json, sampled_at
          FROM projection_observability_samples
          ${where}
          UNION ALL
          SELECT
            projection_type, projection_name, checkpoint_status, pending_events,
            materialized_count, metadata_json, sampled_at
          FROM projection_observability_rollups
          ${where}
        `
        : `
          SELECT
            projection_type, projection_name, checkpoint_status, pending_events,
            materialized_count, metadata_json, sampled_at
          FROM projection_observability_samples
          ${where}
        `;
      const sourceParams = includeRollups ? [...params, ...params] : [...params];
      const totalRow = this.db.prepare(`
        SELECT COUNT(*) AS count FROM (${sourceSql})
      `).get(...sourceParams) as { count: number } | null;
      total = totalRow?.count || 0;

      rows = this.db.prepare(`
        SELECT * FROM (${sourceSql})
        ORDER BY sampled_at DESC, projection_name DESC
        LIMIT ? OFFSET ?
      `).all(...sourceParams, safePageSize, offset) as any[];
    }

    return {
      page: safePage,
      pageSize: safePageSize,
      total,
      samples: rows.map((row) => ({
        projectionType: row.projection_type,
        projectionName: row.projection_name,
        checkpointStatus: row.checkpoint_status,
        pendingEvents: row.pending_events,
        materializedCount: row.materialized_count,
        sampledAt: row.sampled_at,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined
      })),
      appliedFilters: {
        projectionType: filters?.projectionType,
        checkpointStatus: filters?.checkpointStatus,
        bucketMs: filters?.bucketMs,
        aggregateMode,
        startTime: filters?.startTime,
        endTime: filters?.endTime,
        includeRollups
      }
    };
  }

  close(): void {
    this.db.close();
  }
}

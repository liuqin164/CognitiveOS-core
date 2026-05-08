import Database from 'bun:sqlite';
export class PlanRuntimeStore {
    db;
    eventStore;
    constructor(dbPath = ':memory:', eventStore) {
        this.db = new Database(dbPath);
        this.eventStore = eventStore;
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_states (
        runtime_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_key TEXT NOT NULL,
        status TEXT NOT NULL,
        metadata_json TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (runtime_id, entity_type, entity_key)
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_states_runtime
        ON runtime_states(runtime_id, entity_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS runtime_transitions (
        transition_id TEXT PRIMARY KEY,
        runtime_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_key TEXT NOT NULL,
        transition_type TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        payload_json TEXT,
        occurred_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_transitions_runtime
        ON runtime_transitions(runtime_id, occurred_at DESC);
    `);
    }
    upsertState(input, options) {
        const existing = this.getState(input.runtimeId, input.entityType, input.entityKey);
        const updatedAt = input.updatedAt ?? Date.now();
        this.db.prepare(`
      INSERT OR REPLACE INTO runtime_states (
        runtime_id, entity_type, entity_key, status, metadata_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(input.runtimeId, input.entityType, input.entityKey, input.status, input.metadata ? JSON.stringify(input.metadata) : null, updatedAt);
        if (!existing || existing.status !== input.status) {
            this.recordTransition({
                runtimeId: input.runtimeId,
                entityType: input.entityType,
                entityKey: input.entityKey,
                transitionType: 'state_update',
                fromStatus: existing?.status,
                toStatus: input.status,
                payload: input.metadata,
                occurredAt: updatedAt
            });
        }
        if (options?.emitEvent !== false) {
            this.eventStore?.append({
                streamId: `${input.runtimeId}:${input.entityType}:${input.entityKey}`,
                streamType: 'system',
                eventType: 'RUNTIME_STATE_UPDATED',
                occurredAt: updatedAt,
                payload: {
                    runtimeId: input.runtimeId,
                    entityType: input.entityType,
                    entityKey: input.entityKey,
                    status: input.status,
                    metadata: input.metadata
                }
            });
        }
    }
    recordTransition(input, options) {
        const transitionId = `rt-${input.runtimeId}-${input.entityType}-${input.entityKey}-${input.occurredAt || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.db.prepare(`
      INSERT INTO runtime_transitions (
        transition_id, runtime_id, entity_type, entity_key, transition_type,
        from_status, to_status, payload_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(transitionId, input.runtimeId, input.entityType, input.entityKey, input.transitionType, input.fromStatus || null, input.toStatus, input.payload ? JSON.stringify(input.payload) : null, input.occurredAt ?? Date.now());
        if (options?.emitEvent !== false) {
            this.eventStore?.append({
                streamId: `${input.runtimeId}:${input.entityType}:${input.entityKey}`,
                streamType: 'system',
                eventType: 'RUNTIME_TRANSITION_RECORDED',
                occurredAt: input.occurredAt,
                payload: {
                    runtimeId: input.runtimeId,
                    entityType: input.entityType,
                    entityKey: input.entityKey,
                    transitionType: input.transitionType,
                    fromStatus: input.fromStatus,
                    toStatus: input.toStatus,
                    data: input.payload
                }
            });
        }
    }
    getState(runtimeId, entityType, entityKey) {
        const row = this.db.prepare(`
      SELECT runtime_id, entity_type, entity_key, status, metadata_json, updated_at
      FROM runtime_states
      WHERE runtime_id = ? AND entity_type = ? AND entity_key = ?
    `).get(runtimeId, entityType, entityKey);
        if (!row)
            return null;
        return {
            runtimeId: row.runtime_id,
            entityType: row.entity_type,
            entityKey: row.entity_key,
            status: row.status,
            metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
            updatedAt: row.updated_at
        };
    }
    getSnapshot(runtimeId) {
        const states = this.db.prepare(`
      SELECT runtime_id, entity_type, entity_key, status, metadata_json, updated_at
      FROM runtime_states
      WHERE runtime_id = ?
      ORDER BY entity_type ASC, entity_key ASC
    `).all(runtimeId);
        const transitions = this.db.prepare(`
      SELECT transition_id, runtime_id, entity_type, entity_key, transition_type,
             from_status, to_status, payload_json, occurred_at
      FROM runtime_transitions
      WHERE runtime_id = ?
      ORDER BY occurred_at ASC, transition_id ASC
    `).all(runtimeId);
        return {
            runtimeId,
            states: states.map((row) => ({
                runtimeId: row.runtime_id,
                entityType: row.entity_type,
                entityKey: row.entity_key,
                status: row.status,
                metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
                updatedAt: row.updated_at
            })),
            transitions: transitions.map((row) => ({
                transitionId: row.transition_id,
                runtimeId: row.runtime_id,
                entityType: row.entity_type,
                entityKey: row.entity_key,
                transitionType: row.transition_type,
                fromStatus: row.from_status || undefined,
                toStatus: row.to_status,
                payload: row.payload_json ? JSON.parse(row.payload_json) : undefined,
                occurredAt: row.occurred_at
            }))
        };
    }
    getHistoryPage(runtimeId, page = 1, pageSize = 20, filters) {
        const safePage = Math.max(page, 1);
        const safePageSize = Math.max(pageSize, 1);
        const offset = (safePage - 1) * safePageSize;
        const transitionConds = ['runtime_id = ?'];
        const transitionParams = [runtimeId];
        const stateConds = ['runtime_id = ?'];
        const stateParams = [runtimeId];
        if (filters?.entityTypes && filters.entityTypes.length > 0) {
            const placeholders = filters.entityTypes.map(() => '?').join(', ');
            transitionConds.push(`entity_type IN (${placeholders})`);
            stateConds.push(`entity_type IN (${placeholders})`);
            transitionParams.push(...filters.entityTypes);
            stateParams.push(...filters.entityTypes);
        }
        if (filters?.transitionTypes && filters.transitionTypes.length > 0) {
            const placeholders = filters.transitionTypes.map(() => '?').join(', ');
            transitionConds.push(`transition_type IN (${placeholders})`);
            transitionParams.push(...filters.transitionTypes);
        }
        if (filters?.status && filters.status.length > 0) {
            const placeholders = filters.status.map(() => '?').join(', ');
            stateConds.push(`status IN (${placeholders})`);
            stateParams.push(...filters.status);
        }
        if (filters?.startTime !== undefined) {
            transitionConds.push('occurred_at >= ?');
            stateConds.push('updated_at >= ?');
            transitionParams.push(filters.startTime);
            stateParams.push(filters.startTime);
        }
        if (filters?.endTime !== undefined) {
            transitionConds.push('occurred_at <= ?');
            stateConds.push('updated_at <= ?');
            transitionParams.push(filters.endTime);
            stateParams.push(filters.endTime);
        }
        const totalRow = this.db.prepare(`
      SELECT COUNT(*) AS count FROM runtime_transitions WHERE ${transitionConds.join(' AND ')}
    `).get(...transitionParams);
        const transitions = this.db.prepare(`
      SELECT transition_id, runtime_id, entity_type, entity_key, transition_type,
             from_status, to_status, payload_json, occurred_at
      FROM runtime_transitions
      WHERE ${transitionConds.join(' AND ')}
      ORDER BY occurred_at DESC, transition_id DESC
      LIMIT ? OFFSET ?
    `).all(...transitionParams, safePageSize, offset);
        const states = this.db.prepare(`
      SELECT runtime_id, entity_type, entity_key, status, metadata_json, updated_at
      FROM runtime_states
      WHERE ${stateConds.join(' AND ')}
      ORDER BY updated_at DESC, entity_type ASC, entity_key ASC
    `).all(...stateParams);
        return {
            runtimeId,
            page: safePage,
            pageSize: safePageSize,
            totalTransitions: totalRow?.count || 0,
            transitions: transitions.map((row) => ({
                transitionId: row.transition_id,
                runtimeId: row.runtime_id,
                entityType: row.entity_type,
                entityKey: row.entity_key,
                transitionType: row.transition_type,
                fromStatus: row.from_status || undefined,
                toStatus: row.to_status,
                payload: row.payload_json ? JSON.parse(row.payload_json) : undefined,
                occurredAt: row.occurred_at
            })),
            currentStates: states.map((row) => ({
                runtimeId: row.runtime_id,
                entityType: row.entity_type,
                entityKey: row.entity_key,
                status: row.status,
                metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
                updatedAt: row.updated_at
            })),
            appliedFilters: {
                entityTypes: filters?.entityTypes,
                transitionTypes: filters?.transitionTypes,
                status: filters?.status,
                startTime: filters?.startTime,
                endTime: filters?.endTime
            }
        };
    }
    getStateCount() {
        const row = this.db.prepare(`SELECT COUNT(*) AS count FROM runtime_states`).get();
        return row?.count || 0;
    }
    clearAll() {
        this.db.exec(`
      DELETE FROM runtime_states;
      DELETE FROM runtime_transitions;
    `);
    }
    close() {
        this.db.close();
    }
}

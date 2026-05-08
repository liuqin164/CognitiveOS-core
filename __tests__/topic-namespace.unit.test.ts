import { describe, expect, test } from 'bun:test';
import Database from 'bun:sqlite';
import { existsSync, unlinkSync } from 'node:fs';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { migration_0011 } from '../src/migrations/0011_topic_path.js';
import { BrainRecall } from '../src/recall/BrainRecall.js';
import { HierarchicalRecallRouter, normalizeTopicPath } from '../src/recall/HierarchicalRecallRouter.js';
import { TopicFilter, VectorCandidateFilter } from '../src/recall/VectorCandidateFilter.js';
import { TopicScopeRule, defaultToolUsePolicyRules } from '../src/routing/ToolUsePolicy.js';
import { config } from '../src/utils/Config.js';
import type { Neuron } from '../src/types/index.js';

function neuron(graph: MemoryGraph, content: string, topicPath?: string, projectId = 'project-a'): Neuron {
  const now = Date.now();
  const item = NeuronFactory.create(content, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: now, S: [0, 0, 0], V: [] }, {
    projectId,
    topicPath,
    type: 'chat',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    tags: [],
    confidence: 1
  });
  graph.addNeuron(item);
  return item;
}

function recallDeps(graph: MemoryGraph, overrides: Record<string, unknown> = {}) {
  return {
    memoryGraph: graph,
    factStore: {
      listNeuronIdsByEntityIds: () => [],
      listFactsByNeuronIds: () => [],
      listFactsByEntityIds: () => [],
      listEventsByNeuronIds: () => []
    },
    entityStore: {
      findByCanonicalName: () => null,
      findByAlias: () => null,
      findByEntityId: () => null,
      getEntityTimeline: () => []
    },
    beliefStore: { getActiveBeliefsForQuery: () => [] },
    cursorStore: { listRecentUnprocessedSources: () => [] },
    ...overrides
  } as unknown as ConstructorParameters<typeof BrainRecall>[0];
}

describe('topic namespace storage and migration', () => {
  test('stores topicPath on ingested neurons and maps it back through getNeuron', () => {
    const graph = new MemoryGraph();
    const item = neuron(graph, 'router memory hygiene', 'memory/governance');
    expect(graph.getNeuron(item.id)?.metadata.topicPath).toBe('memory/governance');
  });

  test('updates topicPath through updateNeuronMetadata', () => {
    const graph = new MemoryGraph();
    const item = neuron(graph, 'move me', 'old/path');
    graph.updateNeuronMetadata(item.id, { topicPath: 'new/path' });
    expect(graph.getNeuron(item.id)?.metadata.topicPath).toBe('new/path');
  });

  test('lists topic paths inside a project boundary', () => {
    const graph = new MemoryGraph();
    neuron(graph, 'a', 'memory/governance', 'project-a');
    neuron(graph, 'b', 'skills/runtime', 'project-b');
    expect(graph.getTopicPaths('project-a')).toEqual(['memory/governance']);
  });

  test('selects descendants by topic prefix', () => {
    const graph = new MemoryGraph();
    const parent = neuron(graph, 'parent', 'memory');
    const child = neuron(graph, 'child', 'memory/governance');
    neuron(graph, 'other', 'skills/runtime');
    expect(new Set(graph.getNeuronIdsByTopicPrefix('memory', 'project-a'))).toEqual(new Set([parent.id, child.id]));
  });

  test('builds compact topic tree nodes', () => {
    const graph = new MemoryGraph();
    neuron(graph, 'a', 'memory/governance');
    const tree = graph.buildTopicTree('project-a');
    expect(tree[0]).toMatchObject({ path: 'memory/governance', segments: ['memory', 'governance'], neuronCount: 1, projectId: 'project-a' });
  });

  test('migration 0011 adds topic_path and index idempotently', () => {
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE neurons (id TEXT PRIMARY KEY, project_id TEXT);`);
    migration_0011.up(db);
    migration_0011.up(db);
    const columns = db.prepare(`PRAGMA table_info(neurons)`).all() as Array<{ name: string }>;
    const indexes = db.prepare(`PRAGMA index_list(neurons)`).all() as Array<{ name: string }>;
    expect(columns.some((column) => column.name === 'topic_path')).toBe(true);
    expect(indexes.some((index) => index.name === 'idx_neurons_topic_path')).toBe(true);
    db.close();
  });

  test('MemoryGraph opens pre-0011 neuron tables before creating the topic index', () => {
    const dbPath = `/tmp/agent-brain-topic-compat-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE neurons (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        self_hash TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        spatial_x REAL NOT NULL,
        spatial_y REAL NOT NULL,
        spatial_z REAL NOT NULL,
        vector_blob BLOB,
        project_id TEXT,
        file_id TEXT,
        file_path TEXT,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT 0,
        last_activated INTEGER,
        activation_count INTEGER NOT NULL DEFAULT 0,
        aaak_summary TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        tags TEXT,
        file_size INTEGER,
        mime_type TEXT,
        original_name TEXT,
        blob_path TEXT,
        confidence REAL NOT NULL DEFAULT 1.0,
        source_type TEXT,
        source_event_id TEXT,
        importance_level TEXT NOT NULL DEFAULT 'normal',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        stability REAL NOT NULL DEFAULT 1.0,
        repetitions INTEGER NOT NULL DEFAULT 0,
        is_deleted INTEGER NOT NULL DEFAULT 0
      );
    `);
    db.close();

    const graph = new MemoryGraph(dbPath);
    expect(graph.getTopicPaths()).toEqual([]);
    graph.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });
});

describe('hierarchical recall routing and vector topic filter', () => {
  test('normalizes noisy topic paths conservatively', () => {
    expect(normalizeTopicPath(' /Memory//Governance/Contradiction/Extra/More/Drop ')).toBe('memory/governance/contradiction/extra/more');
  });

  test('routes explicit topic hints by CPU-provided namespace', () => {
    const graph = new MemoryGraph();
    const item = neuron(graph, 'contradiction resolver', 'memory/governance');
    const routed = new HierarchicalRecallRouter(graph).route('anything', 'project-a', 'memory/governance');
    expect(routed.fallbackToGlobal).toBe(false);
    expect(routed.candidateNeuronIds).toContain(item.id);
  });

  test('falls back globally when a hint has no matching memories', () => {
    const graph = new MemoryGraph();
    expect(new HierarchicalRecallRouter(graph).route('anything', 'project-a', 'missing/path').fallbackToGlobal).toBe(true);
  });

  test('routes lexical queries to the closest topic path', () => {
    const graph = new MemoryGraph();
    const item = neuron(graph, 'policy text', 'memory/governance');
    neuron(graph, 'skill text', 'skills/runtime');
    const routed = new HierarchicalRecallRouter(graph, { minConfidence: 0.1 }).route('memory governance policy', 'project-a');
    expect(routed.matchedTopicPath).toBe('memory/governance');
    expect(routed.candidateNeuronIds).toContain(item.id);
  });

  test('TopicFilter keeps only topic descendants', () => {
    const graph = new MemoryGraph();
    const parent = neuron(graph, 'parent', 'memory');
    const child = neuron(graph, 'child', 'memory/governance');
    const other = neuron(graph, 'other', 'skills/runtime');
    const filter = new VectorCandidateFilter([new TopicFilter(graph)]);
    expect(filter.filter([parent.id, child.id, other.id], { topicPath: 'memory', queryTime: Date.now() })).toEqual([parent.id, child.id]);
  });
});

describe('topic scope policy and BrainRecall integration', () => {
  test('TopicScopeRule rewrites LLM supplied topicPath', () => {
    const decision = new TopicScopeRule().evaluate(
      { action: 'brain_recall', query: 'memory', topicPath: 'llm/path' } as never,
      { currentIteration: 0, maxIterations: 1, toolCallLog: [], originalQuery: 'memory', topicPath: 'cpu/path' }
    );
    expect(decision?.verdict).toBe('rewrite');
    expect('topicPath' in (decision as unknown as { call: Record<string, unknown> }).call).toBe(false);
  });

  test('default policy includes TopicScopeRule after workspace isolation', () => {
    const names = defaultToolUsePolicyRules().map((rule) => rule.name);
    expect(names.indexOf('workspace_isolation')).toBeLessThan(names.indexOf('topic_scope'));
    expect(names.indexOf('topic_scope')).toBeLessThan(names.indexOf('query_relevance'));
  });

  test('BrainRecall reports topic route info and limits raw evidence to topic candidates', () => {
    const graph = new MemoryGraph();
    const inTopic = neuron(graph, 'memory hygiene contradiction resolver', 'memory/governance');
    neuron(graph, 'skill runtime procedure', 'skills/runtime');
    const recall = new BrainRecall(recallDeps(graph, { hierarchicalRouter: new HierarchicalRecallRouter(graph) }));
    const result = recall.recall('memory hygiene contradiction', { projectId: 'project-a', topicPath: 'memory/governance', includeRawEvidence: true });
    expect(result.topicRouteInfo?.matchedTopicPath).toBe('memory/governance');
    expect(result.rawEvidence.map((item) => item.id)).toEqual([inTopic.id]);
  });

  test('BrainRecall falls back to global recall when topic route has no candidates', () => {
    const graph = new MemoryGraph();
    const global = neuron(graph, 'memory hygiene global', 'memory/governance');
    const recall = new BrainRecall(recallDeps(graph, { hierarchicalRouter: new HierarchicalRecallRouter(graph) }));
    const result = recall.recall('memory hygiene global', { projectId: 'project-a', topicPath: 'missing/path', includeRawEvidence: true });
    expect(result.topicRouteInfo?.fallbackToGlobal).toBe(true);
    expect(result.rawEvidence.map((item) => item.id)).toContain(global.id);
  });

  test('BrainRecall passes matched topic to vector candidate filtering', () => {
    const prev = { ...config.recall };
    config.set('recall.vectorEnabled', true);
    config.set('recall.vectorFallbackThreshold', 99);
    try {
      const graph = new MemoryGraph();
      const vectorHit = neuron(graph, 'vector memory governance hit', 'memory/governance');
      const outOfTopic = neuron(graph, 'vector skill hit', 'skills/runtime');
      const recall = new BrainRecall(recallDeps(graph, {
        hierarchicalRouter: new HierarchicalRecallRouter(graph),
        vectorSearchFn: () => [vectorHit.id, outOfTopic.id],
        vectorCandidateFilter: new VectorCandidateFilter([new TopicFilter(graph)])
      }));
      const result = recall.recall('no lexical match', { projectId: 'project-a', topicPath: 'memory/governance', includeRawEvidence: true, limit: 5 });
      expect(result.strategy.vectorSearchUsed).toBe(true);
      expect(result.rawEvidence.map((item) => item.id)).toContain(vectorHit.id);
      expect(result.rawEvidence.map((item) => item.id)).not.toContain(outOfTopic.id);
    } finally {
      config.set('recall.vectorEnabled', prev.vectorEnabled);
      config.set('recall.vectorFallbackThreshold', prev.vectorFallbackThreshold);
    }
  });
});

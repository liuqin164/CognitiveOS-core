import { describe, expect, test } from 'bun:test';
import { ImportanceSignalDetector } from '../src/engine/ImportanceSignalDetector.js';
import { IngestionEngine } from '../src/engine/IngestionEngine.js';
import { DeterministicEmbedder } from '../src/store/DeterministicEmbedder.js';

describe('ImportanceSignalDetector', () => {
  test('detects permanent signals in Chinese and English', () => {
    expect(ImportanceSignalDetector.detect('这是我的核心约束，永远不能违反')).toBe('permanent');
    expect(ImportanceSignalDetector.detect('remember this permanently as a core constraint')).toBe('permanent');
  });

  test('detects important signals without over-marking ordinary text', () => {
    expect(ImportanceSignalDetector.detect('这很重要，后续部署要遵守')).toBe('important');
    expect(ImportanceSignalDetector.detect('today we talked about the weather')).toBe('normal');
  });

  test('ingestion assigns pinned permanent metadata and stability', async () => {
    const engine = new IngestionEngine(new DeterministicEmbedder(), 'project-a');
    const result = await engine.ingest({
      content: '这是我的核心约束，永远不能违反',
      type: 'chat'
    });

    expect(result.neuron.metadata.importanceLevel).toBe('permanent');
    expect(result.neuron.metadata.isPinned).toBe(true);
    expect(result.neuron.metadata.stability).toBe(9999);
  });
});

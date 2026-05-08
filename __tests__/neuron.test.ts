// ============================================
// 神经元工厂测试
// ============================================

import { describe, it, expect } from 'bun:test';
import { NeuronFactory } from '../src/core/Neuron.js';
import type { Neuron, NeuronCoordinates, NeuronMetadata } from '../src/types/index.js';

describe('NeuronFactory', () => {
  it('should create neuron', () => {
    const content = 'test content';
    const prevHash = 'prev-hash';
    const coordinates: NeuronCoordinates = {
      T: 1234567890,
      S: [1, 2, 3],
      V: [0.1, 0.2, 0.3]
    };
    const metadata: NeuronMetadata = {
      projectId: 'test-project',
      filePath: '/test/file.ts',
      type: 'code',
      createdAt: 1234567890
    };

    const neuron = NeuronFactory.create(content, prevHash, coordinates, metadata);

    expect(neuron).toBeDefined();
    expect(neuron.content).toBe(content);
    expect(neuron.prev_hash).toBe(prevHash);
    expect(neuron.coordinates).toEqual(coordinates);
    expect(neuron.metadata).toEqual(metadata);
    expect(neuron.id).toBeDefined();
    expect(neuron.id).toMatch(/^neuron-/);
  });

  it('should verify valid neuron', () => {
    const content = 'test content';
    const coordinates: NeuronCoordinates = {
      T: 1234567890,
      S: [1, 2, 3],
      V: [0.1, 0.2, 0.3]
    };
    const metadata: NeuronMetadata = {
      type: 'code',
      createdAt: 1234567890
    };

    const neuron = NeuronFactory.create(
      content,
      'prev-hash',
      coordinates,
      metadata
    );

    expect(NeuronFactory.verify(neuron)).toBe(true);
  });

  it('should mark neuron as suspect', () => {
    const content = 'test content';
    const coordinates: NeuronCoordinates = {
      T: 1234567890,
      S: [1, 2, 3],
      V: [0.1, 0.2, 0.3]
    };
    const metadata: NeuronMetadata = {
      type: 'code',
      createdAt: 1234567890
    };

    const neuron = NeuronFactory.create(
      content,
      'prev-hash',
      coordinates,
      metadata
    );

    const suspectNeuron = NeuronFactory.markSuspect(neuron);

    expect(suspectNeuron.metadata.status).toBe('suspect');
  });

  it('should activate neuron', () => {
    const content = 'test content';
    const coordinates: NeuronCoordinates = {
      T: 1234567890,
      S: [1, 2, 3],
      V: [0.1, 0.2, 0.3]
    };
    const metadata: NeuronMetadata = {
      type: 'code',
      createdAt: 1234567890
    };

    const neuron = NeuronFactory.create(
      content,
      'prev-hash',
      coordinates,
      metadata
    );

    const activatedNeuron = NeuronFactory.activate(neuron);

    expect(activatedNeuron.metadata.lastActivated).toBeDefined();
    expect(activatedNeuron.metadata.lastActivated).toBeGreaterThan(0);
  });
});
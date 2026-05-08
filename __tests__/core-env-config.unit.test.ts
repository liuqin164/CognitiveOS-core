import { expect, test } from 'bun:test';

import { parseCoreEnvConfig } from '../src/config/CoreEnvConfig.js';

test('parseCoreEnvConfig maps wizard env to MemoryKernelOptions', () => {
  const parsed = parseCoreEnvConfig({
    COGMEM_DB: './brain.db',
    COGMEM_VECTOR_BACKEND: 'sqlite-vec',
    AB_VECTOR_DIMENSION: '4096',
    COGMEM_PII_REDACT_EMAIL: 'true',
    COGMEM_PII_REDACT_PHONE: 'false',
    COGMEM_PII_REDACT_SSN: 'true',
  });

  expect(parsed.options.dbPath).toBe('./brain.db');
  expect(parsed.options.vectorBackend).toBe('sqlite-vec');
  expect(parsed.options.vectorDimension).toBe(4096);
  expect(parsed.options.redactionPolicy).toEqual({
    email: true,
    phone: false,
    ssn: true,
  });
  expect(parsed.diagnostics).toContainEqual(expect.objectContaining({
    severity: 'warning',
    code: 'high_vector_dimension',
  }));
});

test('parseCoreEnvConfig reports invalid vector backend', () => {
  const parsed = parseCoreEnvConfig({ COGMEM_VECTOR_BACKEND: 'bad-backend' });

  expect(parsed.options.vectorBackend).toBeUndefined();
  expect(parsed.diagnostics).toContainEqual({
    severity: 'error',
    code: 'invalid_vector_backend',
    message: 'COGMEM_VECTOR_BACKEND must be sqlite-vec or hnswlib.',
  });
});

test('parseCoreEnvConfig reports invalid vector dimensions', () => {
  const parsed = parseCoreEnvConfig({ AB_VECTOR_DIMENSION: 'not-a-number' });

  expect(parsed.options.vectorDimension).toBeUndefined();
  expect(parsed.diagnostics).toContainEqual(expect.objectContaining({
    severity: 'error',
    code: 'invalid_vector_dimension',
  }));
});

test('parseCoreEnvConfig rejects partially numeric vector dimensions', () => {
  const parsed = parseCoreEnvConfig({ AB_VECTOR_DIMENSION: '4096px' });

  expect(parsed.options.vectorDimension).toBeUndefined();
  expect(parsed.diagnostics).toContainEqual(expect.objectContaining({
    severity: 'error',
    code: 'invalid_vector_dimension',
  }));
});

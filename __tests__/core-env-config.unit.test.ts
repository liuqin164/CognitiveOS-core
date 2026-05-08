import { expect, test } from 'bun:test';

import { parseCoreEnvConfig } from '../src/config/CoreEnvConfig.js';

test('parseCoreEnvConfig maps wizard env to MemoryKernelOptions', () => {
  const parsed = parseCoreEnvConfig({
    COGMEM_DB: './brain.db',
    COGMEM_VECTOR_BACKEND: 'sqlite-vec',
    COGMEM_PII_REDACT_EMAIL: 'true',
    COGMEM_PII_REDACT_PHONE: 'false',
    COGMEM_PII_REDACT_SSN: 'true',
  });

  expect(parsed.options.dbPath).toBe('./brain.db');
  expect(parsed.options.vectorBackend).toBe('sqlite-vec');
  expect(parsed.options.redactionPolicy).toEqual({
    email: true,
    phone: false,
    ssn: true,
  });
  expect(parsed.diagnostics).toEqual([]);
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

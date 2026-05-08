import type { MemoryKernelOptions } from '../factory.js';
import type { RedactionPolicy } from '../governance/index.js';
import type { VectorBackend } from '../store/IVectorStore.js';
import {
  addVectorDimensionDiagnostics,
  parseVectorDimensionValue,
} from './VectorDimension.js';

export interface CoreEnvDiagnostic {
  severity: 'warning' | 'error';
  code: string;
  message: string;
}

export interface ParsedCoreEnvConfig {
  options: MemoryKernelOptions;
  diagnostics: CoreEnvDiagnostic[];
}

type EnvLike = Record<string, string | undefined>;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

export function parseCoreEnvConfig(env: EnvLike): ParsedCoreEnvConfig {
  const diagnostics: CoreEnvDiagnostic[] = [];
  const options: MemoryKernelOptions = {};

  if (env.COGMEM_DB) options.dbPath = env.COGMEM_DB;

  if (env.COGMEM_VECTOR_BACKEND) {
    if (env.COGMEM_VECTOR_BACKEND === 'sqlite-vec' || env.COGMEM_VECTOR_BACKEND === 'hnswlib') {
      options.vectorBackend = env.COGMEM_VECTOR_BACKEND as VectorBackend;
    } else {
      diagnostics.push({
        severity: 'error',
        code: 'invalid_vector_backend',
        message: 'COGMEM_VECTOR_BACKEND must be sqlite-vec or hnswlib.',
      });
    }
  }

  const vectorDimension = parseVectorDimensionValue(
    env.AB_VECTOR_DIMENSION,
    'AB_VECTOR_DIMENSION',
    diagnostics,
  );
  if (vectorDimension !== undefined) {
    options.vectorDimension = vectorDimension;
    addVectorDimensionDiagnostics(vectorDimension, diagnostics);
  }

  const redactionPolicy: RedactionPolicy = {};
  const email = parseBoolean(env.COGMEM_PII_REDACT_EMAIL);
  const phone = parseBoolean(env.COGMEM_PII_REDACT_PHONE);
  const ssn = parseBoolean(env.COGMEM_PII_REDACT_SSN);
  if (email !== undefined) redactionPolicy.email = email;
  if (phone !== undefined) redactionPolicy.phone = phone;
  if (ssn !== undefined) redactionPolicy.ssn = ssn;
  if (Object.keys(redactionPolicy).length > 0) options.redactionPolicy = redactionPolicy;

  return { options, diagnostics };
}

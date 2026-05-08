import type { MemoryImportanceLevel } from '../types/index.js';

export const IMPORTANCE_STABILITY_MAP: Record<MemoryImportanceLevel, number> = {
  low: 0.35,
  normal: 1.0,
  important: 90.0,
  permanent: 9999.0
};

export type ImportanceLevel = keyof typeof IMPORTANCE_STABILITY_MAP;

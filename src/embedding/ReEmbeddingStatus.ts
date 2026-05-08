export interface ReEmbeddingStatus {
  isRunning: boolean;
  total: number;
  completed: number;
  failed: number;
  percentComplete: number;
  estimatedRemainingMs: number | null;
  lastUpdatedAt: string;
}

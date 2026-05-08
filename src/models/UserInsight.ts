export type UserInsightCategory =
  | 'preference'
  | 'habit'
  | 'domain_knowledge'
  | 'communication_style'
  | 'goal';

export interface UserInsight {
  id: string;
  projectId: string;
  category: UserInsightCategory;
  content: string;
  confidence: number;
  initialConfidence?: number;
  confidenceDelta?: number;
  evidenceNeuronIds: string[];
  createdAt: number;
  lastConfirmedAt: number;
  expiresAt?: number;
}

export function confidenceFromEvidenceCount(count: number): number {
  if (count <= 1) return 0.3;
  if (count <= 3) return 0.5;
  if (count <= 6) return 0.7;
  return 0.9;
}

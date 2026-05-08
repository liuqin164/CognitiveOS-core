export interface EvidenceRef {
  source: 'initial_recall' | 'brain_recall' | 'get_neuron_context' | 'expand_entity' | 'find_file_assets' | 'get_file_context' | 'find_skills';
  toolCallId?: string;
  iterationIndex: number;
  factIds?: string[];
  neuronIds?: string[];
  entityIds?: string[];
}

export interface AnswerEvidenceTrace {
  finalAnswer: string;
  evidenceRefs: EvidenceRef[];
  iterationCount: number;
  toolCallIds: string[];
  stoppedByPolicy: boolean;
  stoppedByMaxIter: boolean;
  totalTokensUsed: number;
}

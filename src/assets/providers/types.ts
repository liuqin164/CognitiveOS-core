export type FileUnderstandingPrivacy = 'local' | 'cloud';
export type FileUnderstandingCostTier = 'free' | 'low' | 'medium' | 'high';
export type FileUnderstandingPolicy = 'local_only' | 'cloud_allowed' | 'cloud_for_complex_only' | 'ask_before_cloud_upload';

export interface FileUnderstandingCapabilities {
  acceptsRawFile: boolean;
  acceptsText: boolean;
  acceptsImage: boolean;
  acceptsAudio: boolean;
  acceptsVideo: boolean;
  supportsOCR: boolean;
  supportsASR: boolean;
  supportsVisionCaption: boolean;
  maxFileSizeMb: number;
  privacy: FileUnderstandingPrivacy;
  costTier: FileUnderstandingCostTier;
}

export interface FileUnderstandingInput {
  task: 'extract_text' | 'ocr' | 'asr' | 'caption' | 'summarize' | 'analyze' | 'modify';
  modality: 'raw_file' | 'text' | 'image' | 'audio' | 'video';
  filePath?: string;
  text?: string;
  sizeBytes?: number;
  complexity?: 'simple' | 'complex';
  userApprovedCloudUpload?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UnderstandingProvenance {
  providerId: string;
  providerPrivacy: FileUnderstandingPrivacy;
  inputAssetId?: string;
  inputChunkIds?: string[];
  inputContentHash: string;
  generatedAt: number;
  confidence?: number;
  userApprovedCloudUpload?: boolean;
}

export interface FileUnderstandingResult {
  text?: string;
  metadata?: Record<string, unknown>;
  provenance: UnderstandingProvenance;
}

export interface FileUnderstandingProvider {
  id: string;
  capabilities: FileUnderstandingCapabilities;
  analyze(input: FileUnderstandingInput): Promise<FileUnderstandingResult>;
}


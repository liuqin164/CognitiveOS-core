import type {
  FileUnderstandingInput,
  FileUnderstandingPolicy,
  FileUnderstandingProvider
} from '../assets/providers/types.js';

export interface ModelCapabilityRouterDecision {
  provider: FileUnderstandingProvider | null;
  reason: string;
  requiresUserApproval: boolean;
}

export class ModelCapabilityRouter {
  constructor(
    private readonly providers: FileUnderstandingProvider[] = [],
    private readonly policy: FileUnderstandingPolicy = 'ask_before_cloud_upload'
  ) {}

  register(provider: FileUnderstandingProvider): void {
    this.providers.push(provider);
  }

  choose(input: FileUnderstandingInput): ModelCapabilityRouterDecision {
    const capable = this.providers
      .filter((provider) => this.matchesCapability(provider, input))
      .filter((provider) => this.withinSizeLimit(provider, input))
      .sort((a, b) => this.rankProvider(a, input) - this.rankProvider(b, input));

    if (capable.length === 0) {
      return { provider: null, reason: 'no_capable_provider', requiresUserApproval: false };
    }

    const local = capable.find((provider) => provider.capabilities.privacy === 'local') || null;
    const cloud = capable.find((provider) => provider.capabilities.privacy === 'cloud') || null;

    if (this.policy === 'local_only') {
      return local
        ? { provider: local, reason: 'local_only_local_provider', requiresUserApproval: false }
        : { provider: null, reason: 'local_only_no_local_provider', requiresUserApproval: false };
    }

    if (this.policy === 'ask_before_cloud_upload') {
      if (local) return { provider: local, reason: 'local_provider_available', requiresUserApproval: false };
      if (cloud && input.userApprovedCloudUpload) {
        return { provider: cloud, reason: 'cloud_approved_by_user', requiresUserApproval: false };
      }
      return { provider: null, reason: 'cloud_upload_requires_user_approval', requiresUserApproval: true };
    }

    if (this.policy === 'cloud_for_complex_only') {
      if (input.complexity === 'complex' && cloud) {
        return { provider: cloud, reason: 'complex_task_cloud_provider', requiresUserApproval: false };
      }
      return local
        ? { provider: local, reason: 'simple_or_local_preferred', requiresUserApproval: false }
        : { provider: null, reason: 'no_local_provider_for_non_complex_task', requiresUserApproval: false };
    }

    return { provider: capable[0], reason: 'cloud_allowed_best_provider', requiresUserApproval: false };
  }

  private matchesCapability(provider: FileUnderstandingProvider, input: FileUnderstandingInput): boolean {
    const c = provider.capabilities;
    if (input.modality === 'raw_file' && !c.acceptsRawFile) return false;
    if (input.modality === 'text' && !c.acceptsText) return false;
    if (input.modality === 'image' && !c.acceptsImage) return false;
    if (input.modality === 'audio' && !c.acceptsAudio) return false;
    if (input.modality === 'video' && !c.acceptsVideo) return false;
    if (input.task === 'ocr' && !c.supportsOCR) return false;
    if (input.task === 'asr' && !c.supportsASR) return false;
    if (input.task === 'caption' && !c.supportsVisionCaption) return false;
    return true;
  }

  private withinSizeLimit(provider: FileUnderstandingProvider, input: FileUnderstandingInput): boolean {
    if (!input.sizeBytes) return true;
    return input.sizeBytes <= provider.capabilities.maxFileSizeMb * 1024 * 1024;
  }

  private rankProvider(provider: FileUnderstandingProvider, input: FileUnderstandingInput): number {
    const privacyRank = provider.capabilities.privacy === 'local' ? 0 : 10;
    const costRank = { free: 0, low: 1, medium: 2, high: 3 }[provider.capabilities.costTier];
    const complexCloudBoost = input.complexity === 'complex' && provider.capabilities.privacy === 'cloud' ? -2 : 0;
    return privacyRank + costRank + complexCloudBoost;
  }
}


import type { UserInsight } from './UserInsight.js';
import type { UserInsightExtractor } from './UserInsightExtractor.js';
import type { UserModelStore } from './UserModelStore.js';
import type { MemoryDelta, WorkingMemoryReporter } from './WorkingMemoryReporter.js';

export interface UserContext {
  projectId: string;
  insights: UserInsight[];
  delta?: MemoryDelta;
  toPromptFragment(): string;
}

export class UserModelManager {
  private readonly latestDeltaByProject = new Map<string, MemoryDelta>();

  constructor(
    private readonly userModelStore: UserModelStore,
    private readonly extractor: UserInsightExtractor,
    private readonly reporter?: WorkingMemoryReporter
  ) {}

  async refresh(projectId: string): Promise<void> {
    const previousSnapshot = this.reporter
      ? this.userModelStore.query(projectId, { minConfidence: 0, limit: Number.MAX_SAFE_INTEGER })
      : [];
    await this.extractor.extract(projectId);
    if (this.reporter) this.latestDeltaByProject.set(projectId, this.reporter.computeDelta(projectId, previousSnapshot));
  }

  getUserContext(projectId: string, topK = 5): UserContext {
    const insights = this.userModelStore.query(projectId, { minConfidence: 0.3, limit: topK });
    const delta = this.latestDeltaByProject.get(projectId);
    return {
      projectId,
      insights,
      delta,
      toPromptFragment: () => formatPromptFragment(projectId, insights, this.reporter?.formatDelta(delta || emptyDelta()))
    };
  }

  evict(): void {
    this.userModelStore.evictExpired();
  }
}

function formatPromptFragment(projectId: string, insights: UserInsight[], deltaFragment = ''): string {
  if (insights.length === 0) return '';
  const lines = insights.map((insight) =>
    `- [${insight.category}, confidence=${insight.confidence.toFixed(1)}] ${insight.content}`
  );
  return ['【用户模型】', `projectId=${projectId}`, deltaFragment, ...lines].filter(Boolean).join('\n');
}

function emptyDelta(): MemoryDelta {
  return { newInsights: [], strengthenedInsights: [], weakenedInsights: [], expiredInsights: [], snapshotAt: Date.now() };
}

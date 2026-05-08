// @ts-nocheck
export interface ConditionEvaluationContext {
  projectId?: string;
  rawQuery?: string;
  conditionHints?: string[];
  entityHints?: string[];
  environmentHints?: string[];
  stateHints?: string[];
  policyHints?: string[];
}

type ConditionNode =
  | ConditionGroupNode
  | ConditionLeafNode;

interface ConditionGroupNode {
      kind: 'group';
      combinator: 'all' | 'any';
      clauses: ConditionNode[];
    }

interface ConditionLeafNode {
  kind: string;
  operator?: 'eq' | 'neq';
  value?: string;
}

export class ConditionDslEvaluator {
  private static readonly VALUE_ALIASES: Record<string, string[]> = {
    production: ['prod', '生产', '生产环境'],
    staging: ['stage', '预发', '预发环境'],
    development: ['dev', '开发', '开发环境'],
    approved: ['approval', '已批准', '审批', '审批通过'],
    running: ['运行中'],
    healthy: ['health', '健康'],
    'circuit-breaker': ['circuit breaker'],
    strict: ['严格']
  };

  static evaluate(dsl: unknown, context: ConditionEvaluationContext): {
    matched: boolean;
    score: number;
    reasons: string[];
    executionReady: boolean;
    normalizedContext: Record<string, string[]>;
    policyActions: Array<{ policy: string; action: 'allow' | 'deny' | 'prefer' }>;
  } {
    if (!dsl || typeof dsl !== 'object') {
      return {
        matched: false,
        score: 0,
        reasons: [],
        executionReady: false,
        normalizedContext: this.buildNormalizedContext(context),
        policyActions: []
      };
    }

    const expr = (dsl as Record<string, unknown>).expr as ConditionNode | undefined;
    const node = expr || this.rehydrateFromFlatClauses((dsl as Record<string, unknown>).clauses);
    if (!node) {
      return {
        matched: false,
        score: 0,
        reasons: [],
        executionReady: false,
        normalizedContext: this.buildNormalizedContext(context),
        policyActions: []
      };
    }

    const result = this.evaluateNode(node, context);
    const normalizedContext = this.buildNormalizedContext(context);
    return {
      matched: result.matched,
      score: result.score,
      reasons: result.reasons,
      executionReady: result.matched && result.reasons.length > 0,
      normalizedContext,
      policyActions: this.buildPolicyActions(normalizedContext, result.matched)
    };
  }

  private static evaluateNode(
    node: ConditionNode,
    context: ConditionEvaluationContext
  ): { matched: boolean; score: number; reasons: string[] } {
    if (node.kind === 'group') {
      const childResults = node.clauses.map((clause: ConditionNode) => this.evaluateNode(clause, context));
      const matched = node.combinator === 'all'
        ? childResults.every((item: { matched: boolean }) => item.matched)
        : childResults.some((item: { matched: boolean }) => item.matched);

      const normalizedScore = childResults.length > 0
        ? childResults.reduce((sum: number, item: { score: number }) => sum + item.score, 0) / childResults.length
        : 0;

      return {
        matched,
        score: normalizedScore,
        reasons: childResults.flatMap((item: { reasons: string[] }) => item.reasons)
      };
    }

    return this.evaluateLeaf(node, context);
  }

  private static evaluateLeaf(
    node: ConditionLeafNode,
    context: ConditionEvaluationContext
  ): { matched: boolean; score: number; reasons: string[] } {
    const value = this.normalizeValue(String(node.value || ''));
    const operator = node.operator || 'eq';
    const corpus = this.toCorpus(context);
    const rawText = [context.rawQuery || '', ...(context.conditionHints || [])].join(' ').toLowerCase();

    let positiveMatch = false;

    if (node.kind === 'project_hint' && context.projectId) {
      positiveMatch = this.matchesValue(context.projectId.toLowerCase(), value);
    } else if (node.kind === 'state') {
      positiveMatch = (context.stateHints || []).some((hint) => this.matchesValue(hint, value));
    } else if (node.kind === 'policy_hint') {
      positiveMatch = (context.policyHints || []).some((hint) => this.matchesValue(hint, value));
    } else if (node.kind === 'approval') {
      positiveMatch = /(approved|approval|已批准|审批)/i.test(corpus);
    } else if (value) {
      positiveMatch = this.matchesValue(corpus, value);
    }

    const explicitNegation = operator === 'neq' && this.hasExplicitNegation(rawText, value);
    const matched = operator === 'neq'
      ? (explicitNegation || !positiveMatch)
      : positiveMatch;
    return {
      matched,
      score: matched ? 1 : 0,
      reasons: matched ? [`condition:${node.kind}:${operator}:${value}`] : []
    };
  }

  private static toCorpus(context: ConditionEvaluationContext): string {
    return [
      context.projectId || '',
      context.rawQuery || '',
      ...(context.conditionHints || []),
      ...(context.entityHints || []),
      ...(context.environmentHints || []),
      ...(context.stateHints || []),
      ...(context.policyHints || [])
    ]
      .join(' ')
      .toLowerCase();
  }

  private static normalizeValue(value: string): string {
    const normalized = value.trim().toLowerCase();
    for (const [canonical, aliases] of Object.entries(this.VALUE_ALIASES)) {
      if (normalized === canonical || aliases.includes(normalized)) return canonical;
    }
    return normalized;
  }

  private static matchesValue(haystack: string, value: string): boolean {
    const normalizedHaystack = haystack.toLowerCase();
    const aliases = [value, ...(this.VALUE_ALIASES[value] || [])];
    return aliases.some((alias) => normalizedHaystack.includes(alias.toLowerCase()));
  }

  private static buildNormalizedContext(context: ConditionEvaluationContext): Record<string, string[]> {
    const normalizeList = (items?: string[]) =>
      Array.from(new Set((items || []).map((item) => this.normalizeValue(item)).filter(Boolean)));

    return {
      environment: normalizeList(context.environmentHints),
      state: normalizeList(context.stateHints),
      policy: normalizeList(context.policyHints),
      entity: normalizeList(context.entityHints),
      condition: normalizeList(context.conditionHints)
    };
  }

  private static buildPolicyActions(
    normalizedContext: Record<string, string[]>,
    matched: boolean
  ): Array<{ policy: string; action: 'allow' | 'deny' | 'prefer' }> {
    const actions: Array<{ policy: string; action: 'allow' | 'deny' | 'prefer' }> = [];
    for (const policy of normalizedContext.policy) {
      if (policy === 'strict' || policy === 'circuit-breaker') {
        actions.push({ policy, action: matched ? 'allow' : 'deny' });
      } else {
        actions.push({ policy, action: matched ? 'prefer' : 'deny' });
      }
    }
    return actions;
  }

  private static rehydrateFromFlatClauses(rawClauses: unknown): ConditionNode | null {
    if (!Array.isArray(rawClauses) || rawClauses.length === 0) return null;
    return {
      kind: 'group',
      combinator: 'all',
      clauses: rawClauses.filter((item): item is ConditionNode => Boolean(item && typeof item === 'object'))
    };
  }

  private static hasExplicitNegation(rawText: string, value: string): boolean {
    if (!rawText || !value) return false;
    return (
      rawText.includes(`not ${value}`) ||
      rawText.includes(`non-${value}`) ||
      rawText.includes(`不是${value}`) ||
      rawText.includes(`非${value}`) ||
      rawText.includes(`不 ${value}`)
    );
  }
}

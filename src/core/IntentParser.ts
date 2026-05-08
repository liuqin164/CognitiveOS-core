// ============================================
// IntentParser - 意图解析器（轻量级规则/正则）
// ============================================

import type { QueryIR, IntentType, QuerySemanticHints, TemporalConstraint, SpatialConstraint } from '../types/query-ir.js';

const TEMPORAL_KEYWORDS: Record<string, TemporalConstraint> = {
  '今天': { relative: 'today' },
  '昨天': { relative: 'yesterday' },
  '本周': { relative: 'this_week' },
  '上周': { relative: 'last_week' },
  '这个月': { relative: 'this_month' },
  '上个月': { relative: 'last_month' },
  '今年': { relative: 'this_year' },
  '去年': { relative: 'last_year' },
  '近半年': { relative: 'past_six_months' },
  '过去半年': { relative: 'past_six_months' },
  '近一年': { relative: 'past_year' },
  '过去一年': { relative: 'past_year' },
  '半年前': { relative: 'around_half_year_ago' },
  'today': { relative: 'today' },
  'yesterday': { relative: 'yesterday' },
  'this week': { relative: 'this_week' },
  'last week': { relative: 'last_week' },
  'this year': { relative: 'this_year' },
  'last year': { relative: 'last_year' },
  'past six months': { relative: 'past_six_months' },
  'last 6 months': { relative: 'past_six_months' },
  'past year': { relative: 'past_year' },
  'half year ago': { relative: 'around_half_year_ago' }
};

const INTENT_KEYWORDS: Record<string, IntentType> = {
  '查找': 'recall', '找': 'recall', 'recall': 'recall', 'search': 'recall',
  '追溯': 'trace', 'trace': 'trace', '溯源': 'trace',
  '更新': 'update', 'update': 'update', '修改': 'update'
};

const ENTITY_STOPWORDS = new Set([
  '的', '了', '是', '在', '和', '与', '或',
  'the', 'a', 'an', 'is', 'are', 'show', 'for', 'my', 'what', 'which',
  'preference', 'decision', 'constraint', 'workflow', 'history'
]);

export class IntentParser {
  static parse(query: string): QueryIR {
    const lowerQuery = query.toLowerCase();
    const entities = this.extractEntities(query);
    const intentType = this.detectIntent(lowerQuery);
    const temporal = this.extractTemporal(lowerQuery);
    const spatial = this.extractSpatial(query);
    const { mustMatch, shouldMatch } = this.extractConstraints(query, entities);
    const semantics = this.extractSemantics(query, lowerQuery, entities, mustMatch, shouldMatch);

    return {
      rawQuery: query,
      entities,
      intentType,
      temporal,
      spatial,
      mustMatch,
      shouldMatch,
      semantics
    };
  }

  private static extractEntities(query: string): string[] {
    const words = query.split(/[\s,，。！？、]+/);
    return words
      .map((word) => word.replace(/^[^\p{L}\p{N}._-]+|[^\p{L}\p{N}._-]+$/gu, ''))
      .filter(w => w.length >= 2 && !ENTITY_STOPWORDS.has(w.toLowerCase()) && !/^\d+$/.test(w))
      .slice(0, 10);
  }

  private static detectIntent(query: string): IntentType {
    for (const [kw, type] of Object.entries(INTENT_KEYWORDS)) {
      if (query.includes(kw)) return type;
    }
    return 'recall';
  }

  private static extractTemporal(query: string): TemporalConstraint {
    for (const [kw, constraint] of Object.entries(TEMPORAL_KEYWORDS)) {
      if (query.includes(kw.toLowerCase())) return constraint;
    }
    // 尝试解析具体日期（YYYY-MM-DD）
    const dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const ts = new Date(dateMatch[1]).getTime();
      return { start: ts, end: ts + 86400000 };
    }
    return {};
  }

  private static extractSpatial(query: string): SpatialConstraint {
    const result: SpatialConstraint = {};
    // 提取项目ID（project:xxx）
    const projectMatch = query.match(/project[:：]\s*([\w.-]+)/i);
    if (projectMatch) result.projectId = projectMatch[1];
    // 提取文件类型（.ts, .js）
    const extMatch = query.match(/\.(\w+)$/);
    if (extMatch) result.fileType = extMatch[1];
    return result;
  }

  private static extractConstraints(query: string, entities: string[]): { mustMatch: string[]; shouldMatch: string[] } {
    // 引号内容为硬约束
    const quoted = query.match(/["「『]([^"」』]+)["」』]/g) || [];
    const mustMatch = quoted.map(q => q.replace(/["「」『』]/g, ''));
    // 其他实体为软约束
    const shouldMatch = entities.filter(e => !mustMatch.includes(e));
    return { mustMatch, shouldMatch };
  }

  private static extractSemantics(
    query: string,
    lowerQuery: string,
    entities: string[],
    mustMatch: string[],
    shouldMatch: string[]
  ): QuerySemanticHints {
    const predicateHint = this.detectPredicateHint(lowerQuery);
    const subjectHint = /(我|i|my|mine)/i.test(query) ? 'user' : undefined;
    const valueHints: string[] = [];

    if (/(喜欢|like|prefer)/i.test(query)) valueHints.push('like');
    if (/(讨厌|dislike|不喜欢)/i.test(query)) valueHints.push('dislike');
    if (/(必须|must use)/i.test(query)) valueHints.push('required');
    if (/(不能|禁止|must not|do not use|don't use)/i.test(query)) valueHints.push('forbidden');
    if (/(选择|决定|choose|decide)/i.test(query)) valueHints.push('selected');
    if (/(retry|重试)/i.test(query)) valueHints.push('retry');
    if (/(rollback|回滚)/i.test(query)) valueHints.push('rollback');
    if (/(recover|recovery|恢复)/i.test(query)) valueHints.push('recover');
    if (/(redeploy|重新部署)/i.test(query)) valueHints.push('redeploy');
    if (/(backoff|退避)/i.test(query)) valueHints.push('backoff');
    if (/(merge|合并)/i.test(query)) valueHints.push('merge');
    if (/(branch|分支)/i.test(query)) valueHints.push('branch');
    if (/(state|状态|transition|迁移)/i.test(query)) valueHints.push('state_transition');
    if (/(policy|策略)/i.test(query)) valueHints.push('policy');

    const conditionHints: string[] = [];
    const conditionalMatches = query.match(/如果.+?(?=[，,]|$)|if\s+.+?(?=[,，]|$)/ig) || [];
    for (const item of conditionalMatches) conditionHints.push(item.trim());

    const environmentHints: string[] = [];
    const envMatches = query.match(/production|prod|staging|stage|dev|development|test|测试|生产|预发|开发/ig) || [];
    for (const item of envMatches) environmentHints.push(item.toLowerCase());

    const stateHints: string[] = [];
    const stateMatches = query.match(/pending|running|healthy|failed|success|approved|approval|等待|运行中|健康|失败|成功|已批准|审批/ig) || [];
    for (const item of stateMatches) stateHints.push(item.toLowerCase());

    const policyHints: string[] = [];
    const policyMatches = query.match(/policy|策略|circuit-breaker|canary|strict|lenient|fallback|quota|rate-limit/ig) || [];
    for (const item of policyMatches) policyHints.push(item.toLowerCase());

    const guardHints: string[] = [];
    const guardMatches = query.match(/guard|approval|approved|gate|准入|批准|审批/ig) || [];
    for (const item of guardMatches) guardHints.push(item.toLowerCase());

    const executorHints: string[] = [];
    const executorMatches = query.match(/executor|runner|worker-runner|agent-runner|执行器|执行/ig) || [];
    for (const item of executorMatches) executorHints.push(item.toLowerCase());

    const validationHints: string[] = [];
    const validationMatches = query.match(/validate|validation|校验|check|health|quota|smoke|metrics/ig) || [];
    for (const item of validationMatches) validationHints.push(item.toLowerCase());

    const mergeHints: string[] = [];
    const mergeMatches = query.match(/merge|合并|release|propagate|传播/ig) || [];
    for (const item of mergeMatches) mergeHints.push(item.toLowerCase());

    const entityHints = Array.from(new Set([...mustMatch, ...shouldMatch, ...entities]))
      .map((item) => item.replace(/^[^\p{L}\p{N}._-]+|[^\p{L}\p{N}._-]+$/gu, ''))
      .map((item) => item.toLowerCase())
      .filter((item) => item.length >= 2)
      .filter((item) => !ENTITY_STOPWORDS.has(item))
      .filter((item) => !/(喜欢|讨厌|必须|不能|workflow|graph|history|历史|版本|偏好|决定|约束)/i.test(item));

    return {
      subjectHint,
      predicateHint,
      entityHints,
      valueHints: Array.from(new Set(valueHints)),
      conditionHints,
      environmentHints: Array.from(new Set(environmentHints)),
      stateHints: Array.from(new Set(stateHints)),
      policyHints: Array.from(new Set(policyHints)),
      guardHints: Array.from(new Set(guardHints)),
      executorHints: Array.from(new Set(executorHints)),
      validationHints: Array.from(new Set(validationHints)),
      mergeHints: Array.from(new Set(mergeHints)),
      asksForHistory: /(历史|history|版本|变化|contradiction|冲突)/i.test(query)
    };
  }

  private static detectPredicateHint(query: string): QuerySemanticHints['predicateHint'] {
    if (/(喜欢|讨厌|偏好|prefer|preference|dislike|like)/i.test(query)) return 'preference';
    if (/(决定|选择|choose|decision|decide)/i.test(query)) return 'decision';
    if (/(约束|限制|必须|不能|constraint|rule)/i.test(query)) return 'constraint';
    if (/(计划|plan|rollback|recover|recovery|redeploy|retry|execute|executor|执行|validate|校验|merge|传播)/i.test(query)) return 'plan';
    if (/(workflow|流程|工作流)/i.test(query)) return 'workflow';
    if (/(graph|架构|依赖链|拓扑)/i.test(query)) return 'graph';
    if (/(先|再|then|first|步骤|sequence)/i.test(query)) return 'sequence';
    if (/(事实|配置|地址|api|endpoint|database|port|which|what is)/i.test(query)) return 'fact';
    return undefined;
  }
}

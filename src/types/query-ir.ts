// ============================================
// QueryIR - 查询意图中间表示
// ============================================

export type IntentType = 'recall' | 'trace' | 'update';

export interface TemporalConstraint {
  start?: number;       // 开始时间戳
  end?: number;         // 结束时间戳
  relative?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_week' | 'last_month' | 'this_year' | 'last_year' | 'past_six_months' | 'past_year' | 'around_half_year_ago';
}

export interface SpatialConstraint {
  projectId?: string;
  filePath?: string;
  fileType?: string;
}

export interface QuerySemanticHints {
  subjectHint?: string;
  predicateHint?: 'preference' | 'decision' | 'constraint' | 'fact' | 'workflow' | 'graph' | 'sequence' | 'plan';
  entityHints: string[];
  valueHints: string[];
  conditionHints: string[];
  environmentHints: string[];
  stateHints: string[];
  policyHints: string[];
  guardHints: string[];
  executorHints: string[];
  validationHints: string[];
  mergeHints: string[];
  asksForHistory: boolean;
}

export interface NativeQueryDirectives {
  entity?: string;
  entityType?: string;
  project?: string;
  branch?: string;
  task?: string;
  cluster?: string;
  time?: string;
  from?: string;
  to?: string;
  around?: string;
  mode?: 'continuous' | 'focused';
}

export interface NativeQueryAstClause {
  type: 'directive' | 'term';
  key?: keyof NativeQueryDirectives;
  value: string;
}

export interface NativeQueryAstGroup {
  kind: 'group';
  operator: 'AND' | 'OR';
  clauses: Array<NativeQueryAstClause | NativeQueryAstGroup>;
}

export interface NativeQueryDebugInfo {
  parseMode: 'grammar';
  residualQuery: string;
  clauses: Array<{
    key: keyof NativeQueryDirectives;
    value: string;
  }>;
  ast?: NativeQueryAstGroup;
}

export interface QueryIR {
  rawQuery: string;
  entities: string[];
  intentType: IntentType;
  temporal: TemporalConstraint;
  spatial: SpatialConstraint;
  mustMatch: string[];      // 硬约束：必须匹配
  shouldMatch: string[];    // 软约束：加分项
  semantics: QuerySemanticHints;
  nativeDirectives?: NativeQueryDirectives;
  nativeQueryDebug?: NativeQueryDebugInfo;
}

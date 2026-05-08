const PREFERENCE_AND_DECISION_RULES = [
    {
        name: 'preference_like_cn',
        regex: /(?:我)\s*(?:很)?喜欢\s*([\w\-./]+)/i,
        predicatePrefix: 'preference.entity.',
        value: 'like',
        confidence: 0.92,
        extractionReason: 'preference_signal'
    },
    {
        name: 'preference_like_cn_generic',
        regex: /(?:今天|本周|这个月)?\s*喜欢\s*([\w\-./]+)/i,
        predicatePrefix: 'preference.entity.',
        value: 'like',
        confidence: 0.84,
        extractionReason: 'preference_signal'
    },
    {
        name: 'preference_like_en',
        regex: /(?:I\s+like)\s*([\w\-./]+)/i,
        predicatePrefix: 'preference.entity.',
        value: 'like',
        confidence: 0.9,
        extractionReason: 'preference_signal'
    },
    {
        name: 'preference_dislike_cn',
        regex: /(?:我)\s*(?:很)?讨厌\s*([\w\-./]+)/i,
        predicatePrefix: 'preference.entity.',
        value: 'dislike',
        confidence: 0.94,
        extractionReason: 'preference_signal'
    },
    {
        name: 'preference_dislike_en',
        regex: /(?:I\s+dislike|不喜欢)\s*([\w\-./]+)/i,
        predicatePrefix: 'preference.entity.',
        value: 'dislike',
        confidence: 0.9,
        extractionReason: 'preference_signal'
    },
    {
        name: 'preference_prefer',
        regex: /(?:I\s+prefer|偏好)\s*([\w\-./]+)/i,
        predicatePrefix: 'preference.entity.',
        value: 'prefer',
        confidence: 0.88,
        extractionReason: 'preference_signal'
    },
    {
        name: 'decision_selected',
        regex: /(?:决定|决定使用|decide to use|choose)\s*([\w\-./]+)/i,
        predicatePrefix: 'decision.entity.',
        value: 'selected',
        confidence: 0.82,
        extractionReason: 'decision_statement'
    }
];
const CONSTRAINT_RULES = [
    {
        name: 'constraint_required_cn',
        regex: /(?:必须(?:使用)?|一定要使用)\s*([\w\-./]+)/i,
        predicatePrefix: 'constraint.entity.',
        value: 'required',
        confidence: 0.9,
        extractionReason: 'workflow_rule'
    },
    {
        name: 'constraint_required_en',
        regex: /(?:must use)\s*([\w\-./]+)/i,
        predicatePrefix: 'constraint.entity.',
        value: 'required',
        confidence: 0.9,
        extractionReason: 'workflow_rule'
    },
    {
        name: 'constraint_required_conditional',
        regex: /(?:如果.+?[，,]\s*(?:就|则)\s*(?:使用|use))\s*([\w\-./]+)/i,
        predicatePrefix: 'constraint.entity.',
        value: 'required',
        confidence: 0.88,
        extractionReason: 'workflow_rule'
    },
    {
        name: 'constraint_forbidden_cn',
        regex: /(?:不能(?:使用)?|禁止使用|不要用)\s*([\w\-./]+)/i,
        predicatePrefix: 'constraint.entity.',
        value: 'forbidden',
        confidence: 0.93,
        extractionReason: 'workflow_rule'
    },
    {
        name: 'constraint_forbidden_en',
        regex: /(?:must not use|do not use|don't use)\s*([\w\-./]+)/i,
        predicatePrefix: 'constraint.entity.',
        value: 'forbidden',
        confidence: 0.93,
        extractionReason: 'workflow_rule'
    }
];
const WORKFLOW_RULES = [
    {
        name: 'workflow_cn',
        regex: /(?:流程|工作流)\s*(?:是|为|:)\s*([\w\-./]+)/i,
        predicatePrefix: 'workflow.entity.',
        value: 'default',
        confidence: 0.78,
        extractionReason: 'workflow_rule'
    },
    {
        name: 'workflow_en',
        regex: /(?:workflow)\s*(?:is|:)\s*([\w\-./]+)/i,
        predicatePrefix: 'workflow.entity.',
        value: 'default',
        confidence: 0.78,
        extractionReason: 'workflow_rule'
    }
];
const FACT_RULES = [
    {
        name: 'fact_api_endpoint',
        regex: /(?:api endpoint|endpoint)\s*(?:is|=|是)\s*([^\s,，。]+)/i,
        predicate: 'fact.api_endpoint',
        confidence: 0.88
    },
    {
        name: 'fact_base_url',
        regex: /(?:api base url|base url)\s*(?:is|=|是)\s*([^\s,，。]+)/i,
        predicate: 'fact.api_base_url',
        confidence: 0.9
    },
    {
        name: 'fact_database',
        regex: /(?:数据库|database)\s*(?:is|=|是)\s*([\w\-./]+)/i,
        predicate: 'fact.database',
        confidence: 0.84
    }
];
export class BeliefExtractor {
    extract(context) {
        const { neuron, sourceEventId } = context;
        if (neuron.metadata.type !== 'chat' && neuron.metadata.type !== 'doc')
            return [];
        const content = neuron.content.trim();
        if (!content)
            return [];
        const base = this.getBaseContext(neuron, sourceEventId, content);
        const candidates = [
            ...this.extractSchemaRules(content, base, PREFERENCE_AND_DECISION_RULES),
            ...this.extractSchemaRules(content, base, CONSTRAINT_RULES),
            ...this.extractSchemaRules(content, base, WORKFLOW_RULES),
            ...this.extractFactRules(content, base),
            ...this.extractMultiSlotFacts(content, base),
            ...this.extractExecutablePlanGraphs(content, base),
            ...this.extractProceduralSequences(content, base),
            ...this.extractNestedFactGraphs(content, base)
        ];
        return this.dedupeCandidates(candidates);
    }
    extractSchemaRules(content, base, rules) {
        const matches = [];
        for (const rule of rules) {
            const match = content.match(rule.regex);
            if (!match?.[1])
                continue;
            const entity = this.normalizeEntity(match[1]);
            if (!entity)
                continue;
            const value = typeof rule.value === 'function' ? rule.value(match) : rule.value;
            const temporal = this.extractTemporalWindow(content, base.createdAt);
            const conditional = this.extractCondition(content);
            matches.push({
                projectId: base.projectId,
                scope: base.scope,
                subject: 'user',
                predicate: `${rule.predicatePrefix}${entity}`,
                objectValue: {
                    raw: value,
                    normalized: value,
                    type: rule.valueType || 'enum'
                },
                confidence: rule.confidence,
                sourceNeuronId: base.neuronId,
                sourceEventId: base.sourceEventId,
                sourceType: base.sourceType,
                validityKind: this.resolveValidityKind(temporal.kind, conditional ? 'conditional' : undefined),
                validFrom: temporal.validFrom,
                validTo: temporal.validTo,
                explanation: content,
                metadata: {
                    extractorRule: rule.name,
                    ...(conditional ? {
                        conditionExpr: conditional.raw,
                        conditionDsl: conditional.dsl
                    } : {}),
                    ...(temporal.dsl ? { temporalDsl: temporal.dsl } : {})
                },
                extractionReason: rule.extractionReason
            });
        }
        return matches;
    }
    extractFactRules(content, base) {
        const matches = [];
        for (const rule of FACT_RULES) {
            const match = content.match(rule.regex);
            if (!match?.[1])
                continue;
            const value = this.normalizeFactValue(match[1]);
            if (!value)
                continue;
            const temporal = this.extractTemporalWindow(content, base.createdAt);
            matches.push({
                projectId: base.projectId,
                scope: base.scope,
                subject: 'user',
                predicate: rule.predicate,
                objectValue: {
                    raw: value,
                    normalized: value,
                    type: 'string'
                },
                confidence: rule.confidence,
                sourceNeuronId: base.neuronId,
                sourceEventId: base.sourceEventId,
                sourceType: base.sourceType,
                validityKind: temporal.kind,
                validFrom: temporal.validFrom,
                validTo: temporal.validTo,
                explanation: content,
                metadata: {
                    extractorRule: rule.name,
                    ...(temporal.dsl ? { temporalDsl: temporal.dsl } : {})
                },
                extractionReason: 'tool_verified_fact'
            });
        }
        return matches;
    }
    extractMultiSlotFacts(content, base) {
        const temporal = this.extractTemporalWindow(content, base.createdAt);
        const matches = [];
        const serviceUses = content.match(/(?:service|服务)\s*([\w\-./]+)\s*(?:uses|使用)\s*([\w\-./]+)/i);
        if (serviceUses?.[1] && serviceUses?.[2]) {
            const subject = this.normalizeEntity(serviceUses[1]);
            const target = this.normalizeEntity(serviceUses[2]);
            if (subject && target) {
                matches.push({
                    projectId: base.projectId,
                    scope: base.scope,
                    subject: 'user',
                    predicate: `fact.service.${subject}.backend`,
                    objectValue: {
                        raw: target,
                        normalized: target,
                        type: 'string'
                    },
                    confidence: 0.84,
                    sourceNeuronId: base.neuronId,
                    sourceEventId: base.sourceEventId,
                    sourceType: base.sourceType,
                    validityKind: temporal.kind,
                    validFrom: temporal.validFrom,
                    validTo: temporal.validTo,
                    explanation: content,
                    metadata: {
                        extractorRule: 'fact_service_backend',
                        slots: {
                            entityType: 'service',
                            subject,
                            relation: 'backend',
                            target
                        },
                        ...(temporal.dsl ? { temporalDsl: temporal.dsl } : {})
                    },
                    extractionReason: 'tool_verified_fact'
                });
            }
        }
        const portBinding = content.match(/(?:service|module|服务|模块)\s*([\w\-./]+)\s*(?:runs on port|port|运行在端口)\s*(\d{2,5})/i);
        if (portBinding?.[1] && portBinding?.[2]) {
            const subject = this.normalizeEntity(portBinding[1]);
            const port = portBinding[2];
            if (subject) {
                matches.push({
                    projectId: base.projectId,
                    scope: base.scope,
                    subject: 'user',
                    predicate: `fact.entity.${subject}.port`,
                    objectValue: {
                        raw: port,
                        normalized: port,
                        type: 'number'
                    },
                    confidence: 0.86,
                    sourceNeuronId: base.neuronId,
                    sourceEventId: base.sourceEventId,
                    sourceType: base.sourceType,
                    validityKind: temporal.kind,
                    validFrom: temporal.validFrom,
                    validTo: temporal.validTo,
                    explanation: content,
                    metadata: {
                        extractorRule: 'fact_entity_port',
                        slots: {
                            subject,
                            property: 'port',
                            value: Number(port)
                        },
                        ...(temporal.dsl ? { temporalDsl: temporal.dsl } : {})
                    },
                    extractionReason: 'tool_verified_fact'
                });
            }
        }
        return matches;
    }
    extractProceduralSequences(content, base) {
        const steps = this.parseSequenceSteps(content);
        if (steps.length < 2)
            return [];
        const temporal = this.extractTemporalWindow(content, base.createdAt);
        return [{
                projectId: base.projectId,
                scope: base.scope,
                subject: 'user',
                predicate: 'workflow.sequence.primary',
                objectValue: {
                    raw: JSON.stringify(steps),
                    normalized: steps.join(' > '),
                    json: steps,
                    type: 'json'
                },
                confidence: 0.8,
                sourceNeuronId: base.neuronId,
                sourceEventId: base.sourceEventId,
                sourceType: base.sourceType,
                validityKind: temporal.kind,
                validFrom: temporal.validFrom,
                validTo: temporal.validTo,
                explanation: content,
                metadata: {
                    extractorRule: 'workflow_sequence',
                    sequenceDsl: {
                        version: 1,
                        type: 'ordered_steps',
                        steps
                    },
                    ...(temporal.dsl ? { temporalDsl: temporal.dsl } : {})
                },
                extractionReason: 'workflow_rule'
            }];
    }
    extractExecutablePlanGraphs(content, base) {
        const plan = this.parseExecutablePlanGraph(content);
        if (!plan)
            return [];
        const temporal = this.extractTemporalWindow(content, base.createdAt);
        return [{
                projectId: base.projectId,
                scope: base.scope,
                subject: 'user',
                predicate: 'workflow.plan.primary',
                objectValue: {
                    raw: JSON.stringify(plan),
                    normalized: plan.nodes.join(' -> '),
                    json: plan,
                    type: 'json'
                },
                confidence: 0.84,
                sourceNeuronId: base.neuronId,
                sourceEventId: base.sourceEventId,
                sourceType: base.sourceType,
                validityKind: temporal.kind,
                validFrom: temporal.validFrom,
                validTo: temporal.validTo,
                explanation: content,
                metadata: {
                    extractorRule: 'workflow_plan_primary',
                    planDsl: {
                        version: 1,
                        type: 'executable_plan_graph',
                        entrySteps: plan.entrySteps,
                        nodes: plan.nodes,
                        edges: plan.edges,
                        handlers: plan.handlers,
                        retryPolicies: plan.retryPolicies,
                        mergePoints: plan.mergePoints,
                        branchPoints: plan.branchPoints,
                        stateTransitions: plan.stateTransitions,
                        policyExecutors: plan.policyExecutors,
                        executionGuards: plan.executionGuards,
                        stateMachines: plan.stateMachines,
                        policyRuntime: plan.policyRuntime,
                        mergeConstraints: plan.mergeConstraints,
                        runtimeValidation: plan.runtimeValidation,
                        executorBindings: plan.executorBindings,
                        mergePropagation: plan.mergePropagation
                    },
                    ...(temporal.dsl ? { temporalDsl: temporal.dsl } : {})
                },
                extractionReason: 'workflow_rule'
            }];
    }
    extractNestedFactGraphs(content, base) {
        const graph = this.parseNestedFactGraph(content);
        if (!graph)
            return [];
        const temporal = this.extractTemporalWindow(content, base.createdAt);
        return [{
                projectId: base.projectId,
                scope: base.scope,
                subject: 'user',
                predicate: 'fact.graph.primary',
                objectValue: {
                    raw: JSON.stringify(graph),
                    normalized: graph.path.join(' -> '),
                    json: graph,
                    type: 'json'
                },
                confidence: 0.82,
                sourceNeuronId: base.neuronId,
                sourceEventId: base.sourceEventId,
                sourceType: base.sourceType,
                validityKind: temporal.kind,
                validFrom: temporal.validFrom,
                validTo: temporal.validTo,
                explanation: content,
                metadata: {
                    extractorRule: 'fact_graph_primary',
                    graphDsl: {
                        version: 1,
                        type: 'path_graph',
                        nodes: graph.nodes,
                        edges: graph.edges
                    },
                    ...(temporal.dsl ? { temporalDsl: temporal.dsl } : {})
                },
                extractionReason: 'tool_verified_fact'
            }];
    }
    extractTemporalWindow(content, now) {
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const dayStart = startOfToday.getTime();
        if (/(今天|today)/i.test(content)) {
            return {
                kind: 'time_range',
                validFrom: dayStart,
                validTo: dayStart + 86400000,
                dsl: {
                    version: 1,
                    type: 'relative_range',
                    unit: 'day',
                    relation: 'current'
                }
            };
        }
        if (/(本周|this week)/i.test(content)) {
            const date = new Date(now);
            const day = date.getDay() || 7;
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (day - 1));
            const start = date.getTime();
            return {
                kind: 'time_range',
                validFrom: start,
                validTo: start + 7 * 86400000,
                dsl: {
                    version: 1,
                    type: 'relative_range',
                    unit: 'week',
                    relation: 'current'
                }
            };
        }
        if (/(这个月|this month)/i.test(content)) {
            const date = new Date(now);
            date.setHours(0, 0, 0, 0);
            date.setDate(1);
            const start = date.getTime();
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
            return {
                kind: 'time_range',
                validFrom: start,
                validTo: end,
                dsl: {
                    version: 1,
                    type: 'relative_range',
                    unit: 'month',
                    relation: 'current'
                }
            };
        }
        return { validFrom: now };
    }
    extractCondition(content) {
        const cnIf = content.match(/如果(.+?)[，,]\s*(?:就|则)/i);
        if (cnIf?.[1]) {
            const raw = cnIf[1].trim();
            return {
                raw,
                dsl: this.buildConditionDsl(raw, 'zh')
            };
        }
        const enIf = content.match(/if\s+(.+?)[,，]\s*(?:then\s+)?/i);
        if (enIf?.[1]) {
            const raw = enIf[1].trim();
            return {
                raw,
                dsl: this.buildConditionDsl(raw, 'en')
            };
        }
        const inProject = content.match(/在\s*([\w\-./]+)\s*项目里/i);
        if (inProject?.[1]) {
            const projectHint = inProject[1].trim().toLowerCase();
            return {
                raw: `在 ${projectHint} 项目里`,
                dsl: {
                    version: 1,
                    op: 'when',
                    combinator: 'all',
                    clauses: [{ kind: 'project_hint', operator: 'eq', value: projectHint }]
                }
            };
        }
        return undefined;
    }
    resolveValidityKind(temporalKind, conditionalKind) {
        if (conditionalKind)
            return conditionalKind;
        return temporalKind;
    }
    getBaseContext(neuron, sourceEventId, content) {
        return {
            neuronId: neuron.id,
            projectId: neuron.metadata.projectId,
            scope: neuron.metadata.projectId ? 'project' : 'global',
            sourceType: neuron.metadata.sourceType || 'user_input',
            sourceEventId,
            createdAt: neuron.metadata.createdAt,
            content
        };
    }
    normalizeEntity(raw) {
        const entity = raw.trim().toLowerCase().replace(/^[\s"'`]+|[\s"'`?!.。，！？]+$/g, '');
        return entity.length >= 2 ? entity : null;
    }
    normalizeFactValue(raw) {
        const value = raw.trim().replace(/^[\s"'`]+|[\s"'`。！？,，]+$/g, '');
        return value.length >= 2 ? value : null;
    }
    parseSequenceSteps(content) {
        const cleaned = content.replace(/^(?:plan|计划|workflow|流程)\s*[:：]\s*/i, '').trim();
        if (/先|再/.test(cleaned)) {
            const normalized = cleaned.replace(/然后|接着/g, '再');
            const parts = normalized
                .split(/先|再/)
                .map((step) => step.trim())
                .filter((step) => step.length > 0)
                .map((step) => step.split(/[\s,，。]+/)[0].toLowerCase());
            if (parts.length >= 2)
                return parts;
        }
        if (/first|then|->/i.test(cleaned)) {
            const normalized = cleaned
                .replace(/first/gi, '')
                .replace(/then/gi, '->');
            const parts = normalized
                .split(/->/)
                .map((step) => step.trim())
                .filter((step) => step.length > 0)
                .map((step) => step.split(/[\s,，。]+/)[0].toLowerCase());
            if (parts.length >= 2)
                return parts;
        }
        return [];
    }
    buildConditionDsl(raw, lang) {
        const normalized = raw.replace(/\s+/g, ' ').trim();
        const expr = this.parseConditionExpression(normalized, lang);
        const clauses = this.flattenConditionClauses(expr);
        return {
            version: 2,
            op: 'when',
            combinator: expr.kind === 'group' ? expr.combinator : 'single',
            clauses,
            expr
        };
    }
    toConditionClause(part, lang) {
        if (lang === 'zh') {
            const negativeProject = part.match(/不是\s*([\w\u4e00-\u9fa5\-./]+)\s*环境/i);
            if (negativeProject?.[1]) {
                return { kind: 'environment', operator: 'neq', value: negativeProject[1].toLowerCase() };
            }
            const project = part.match(/(?:是)?\s*([\w\u4e00-\u9fa5\-./]+)\s*项目/i);
            if (project?.[1]) {
                return { kind: 'project_hint', operator: 'eq', value: project[1].toLowerCase() };
            }
            const positiveEnv = part.match(/(?:是|在)?\s*([\w\u4e00-\u9fa5\-./]+)\s*环境/i);
            if (positiveEnv?.[1]) {
                return { kind: 'environment', operator: 'eq', value: positiveEnv[1].toLowerCase() };
            }
            const state = part.match(/([\w\u4e00-\u9fa5\-./]+)\s*状态/i);
            if (state?.[1]) {
                return { kind: 'state', operator: 'eq', value: state[1].toLowerCase() };
            }
            if (/已批准|审批通过|approved|approval/i.test(part)) {
                return { kind: 'approval', operator: 'eq', value: 'approved' };
            }
            const policy = part.match(/([\w\u4e00-\u9fa5\-./]+)\s*策略/i);
            if (policy?.[1]) {
                return { kind: 'policy_hint', operator: 'eq', value: policy[1].toLowerCase() };
            }
        }
        else {
            const negativeEnv = part.match(/not\s+([\w\-./]+)\s+env/i);
            if (negativeEnv?.[1]) {
                return { kind: 'environment', operator: 'neq', value: negativeEnv[1].toLowerCase() };
            }
            const project = part.match(/([\w\-./]+)\s+project/i);
            if (project?.[1]) {
                return { kind: 'project_hint', operator: 'eq', value: project[1].toLowerCase() };
            }
            const positiveEnv = part.match(/([\w\-./]+)\s+env/i);
            if (positiveEnv?.[1]) {
                return { kind: 'environment', operator: 'eq', value: positiveEnv[1].toLowerCase() };
            }
            const state = part.match(/([\w\-./]+)\s+state/i);
            if (state?.[1]) {
                return { kind: 'state', operator: 'eq', value: state[1].toLowerCase() };
            }
            if (/approved|approval/i.test(part)) {
                return { kind: 'approval', operator: 'eq', value: 'approved' };
            }
            const policy = part.match(/([\w\-./]+)\s+policy/i);
            if (policy?.[1]) {
                return { kind: 'policy_hint', operator: 'eq', value: policy[1].toLowerCase() };
            }
        }
        return { kind: 'raw_text', operator: 'eq', value: part };
    }
    parseConditionExpression(raw, lang) {
        const normalized = this.stripOuterParentheses(this.normalizeConditionOperators(raw, lang));
        const orParts = this.splitTopLevelByOperators(normalized, lang === 'zh' ? ['或者', '或'] : ['or']);
        if (orParts.length > 1) {
            return {
                kind: 'group',
                combinator: 'any',
                clauses: orParts.map((part) => this.parseConditionExpression(part, lang))
            };
        }
        const andParts = this.splitTopLevelByOperators(normalized, lang === 'zh' ? ['并且', '而且', '且', '和'] : ['and']);
        if (andParts.length > 1) {
            return {
                kind: 'group',
                combinator: 'all',
                clauses: andParts.map((part) => this.parseConditionExpression(part, lang))
            };
        }
        return this.toConditionClause(normalized, lang);
    }
    flattenConditionClauses(expr) {
        const kind = String(expr.kind || '');
        if (kind !== 'group')
            return [expr];
        const clauses = Array.isArray(expr.clauses) ? expr.clauses : [];
        return clauses.flatMap((clause) => this.flattenConditionClauses(clause));
    }
    normalizeConditionOperators(raw, lang) {
        const normalized = raw
            .replace(/[（【]/g, '(')
            .replace(/[）】]/g, ')')
            .replace(/\s+/g, ' ')
            .trim();
        if (lang === 'zh') {
            return normalized
                .replace(/并且|而且|以及/g, '且')
                .replace(/或者/g, '或');
        }
        return normalized
            .replace(/\&\&/g, ' and ')
            .replace(/\|\|/g, ' or ');
    }
    stripOuterParentheses(raw) {
        let text = raw.trim();
        while (text.startsWith('(') && text.endsWith(')') && this.isBalancedParentheses(text.slice(1, -1))) {
            text = text.slice(1, -1).trim();
        }
        return text;
    }
    isBalancedParentheses(raw) {
        let depth = 0;
        for (const ch of raw) {
            if (ch === '(')
                depth += 1;
            if (ch === ')') {
                depth -= 1;
                if (depth < 0)
                    return false;
            }
        }
        return depth === 0;
    }
    splitTopLevelByOperators(raw, operators) {
        const parts = [];
        let buffer = '';
        let depth = 0;
        let index = 0;
        while (index < raw.length) {
            const ch = raw[index];
            if (ch === '(') {
                depth += 1;
                buffer += ch;
                index += 1;
                continue;
            }
            if (ch === ')') {
                depth -= 1;
                buffer += ch;
                index += 1;
                continue;
            }
            if (depth === 0) {
                const matched = operators.find((operator) => raw.slice(index, index + operator.length).toLowerCase() === operator.toLowerCase());
                if (matched) {
                    if (buffer.trim())
                        parts.push(buffer.trim());
                    buffer = '';
                    index += matched.length;
                    continue;
                }
            }
            buffer += ch;
            index += 1;
        }
        if (buffer.trim())
            parts.push(buffer.trim());
        return parts.length > 0 ? parts : [raw];
    }
    parseNestedFactGraph(content) {
        const graphMatch = content.match(/(?:graph|architecture|架构)\s*[:：]\s*([^\n]+)/i);
        const candidate = graphMatch?.[1] || (/->/.test(content) ? content : '');
        if (!candidate)
            return null;
        const path = candidate
            .split(/->|→/)
            .map((part) => part.trim().toLowerCase())
            .filter((part) => /^[\w\-./]+$/.test(part));
        if (path.length < 3)
            return null;
        const edges = path.slice(0, -1).map((from, index) => ({
            from,
            to: path[index + 1]
        }));
        return {
            path,
            nodes: Array.from(new Set(path)),
            edges
        };
    }
    parseExecutablePlanGraph(content) {
        if (!/(plan|计划|rollback|recover|recovery|redeploy|retry|失败)/i.test(content))
            return null;
        const baseSegment = content.split(/如果|if\s+/i)[0]?.trim() || content;
        const entrySteps = this.parseSequenceSteps(baseSegment);
        const handlers = this.parsePlanHandlers(content);
        const retryPolicies = this.parseRetryPolicies(content);
        const mergePoints = this.parseMergePoints(content);
        const branchPoints = this.parseBranchPoints(content);
        const stateTransitions = this.parseStateTransitions(content);
        const policyExecutors = this.parsePolicyExecutors(content);
        const executionGuards = this.parseExecutionGuards(content);
        const stateMachines = this.parseStateMachines(content);
        const policyRuntime = this.parsePolicyRuntime(content);
        const mergeConstraints = this.parseMergeConstraints(content);
        const runtimeValidation = this.parseRuntimeValidation(content);
        const executorBindings = this.parseExecutorBindings(content);
        const mergePropagation = this.parseMergePropagation(content);
        if (entrySteps.length < 2 && handlers.length === 0 && retryPolicies.length === 0 && mergePoints.length === 0 && branchPoints.length === 0 && stateTransitions.length === 0 && policyExecutors.length === 0 && executionGuards.length === 0 && stateMachines.length === 0 && policyRuntime.length === 0 && mergeConstraints.length === 0 && runtimeValidation.length === 0 && executorBindings.length === 0 && mergePropagation.length === 0)
            return null;
        const nodes = new Set(entrySteps);
        const edges = [];
        for (let i = 0; i < entrySteps.length - 1; i++) {
            edges.push({ from: entrySteps[i], to: entrySteps[i + 1], kind: 'dependency' });
        }
        for (const handler of handlers) {
            nodes.add(handler.trigger);
            for (const step of handler.steps)
                nodes.add(step);
            if (handler.steps[0]) {
                edges.push({ from: handler.trigger, to: handler.steps[0], kind: 'failure' });
            }
            for (let i = 0; i < handler.steps.length - 1; i++) {
                edges.push({ from: handler.steps[i], to: handler.steps[i + 1], kind: 'recovery' });
            }
        }
        for (const policy of retryPolicies) {
            nodes.add(policy.target);
            edges.push({ from: policy.target, to: policy.target, kind: 'retry' });
        }
        for (const mergePoint of mergePoints) {
            nodes.add(mergePoint.into);
            for (const branch of mergePoint.branches) {
                nodes.add(branch);
                edges.push({ from: branch, to: mergePoint.into, kind: 'merge' });
            }
        }
        for (const branchPoint of branchPoints) {
            nodes.add(branchPoint.from);
            for (const branch of branchPoint.branches) {
                nodes.add(branch);
                edges.push({ from: branchPoint.from, to: branch, kind: 'branch' });
            }
        }
        for (const transition of stateTransitions) {
            nodes.add(transition.entity);
            nodes.add(transition.from);
            nodes.add(transition.to);
            edges.push({ from: transition.from, to: transition.to, kind: 'state_transition' });
        }
        for (const executor of policyExecutors) {
            nodes.add(executor.target);
        }
        for (const guard of executionGuards) {
            nodes.add(guard.target);
            for (const requirement of guard.requires)
                nodes.add(requirement);
        }
        for (const machine of stateMachines) {
            nodes.add(machine.entity);
            for (const state of machine.states)
                nodes.add(state);
        }
        for (const runtime of policyRuntime) {
            nodes.add(runtime.target);
            nodes.add(runtime.policy);
        }
        for (const constraint of mergeConstraints) {
            nodes.add(constraint.into);
            for (const requirement of constraint.requires)
                nodes.add(requirement);
        }
        for (const validation of runtimeValidation) {
            nodes.add(validation.target);
            for (const check of validation.checks)
                nodes.add(check);
        }
        for (const binding of executorBindings) {
            nodes.add(binding.target);
            nodes.add(binding.executor);
        }
        for (const propagation of mergePropagation) {
            nodes.add(propagation.into);
            for (const item of propagation.propagates)
                nodes.add(item);
        }
        if (edges.length === 0)
            return null;
        return {
            entrySteps,
            nodes: Array.from(nodes),
            edges,
            handlers,
            retryPolicies,
            mergePoints,
            branchPoints,
            stateTransitions,
            policyExecutors,
            executionGuards,
            stateMachines,
            policyRuntime,
            mergeConstraints,
            runtimeValidation,
            executorBindings,
            mergePropagation
        };
    }
    parsePlanHandlers(content) {
        const handlers = [];
        const cnPattern = /([\w\-./]+)\s*失败(?:了)?\s*(?:就|则|后)?\s*([^\n，。,；;]+)/gi;
        let match;
        while ((match = cnPattern.exec(content)) !== null) {
            const trigger = this.normalizeEntity(match[1] || '');
            const steps = this.parseHandlerSteps(match[2] || '');
            if (trigger && steps.length > 0)
                handlers.push({ trigger, on: 'failure', steps });
        }
        const enPattern = /if\s+([\w\-./]+)\s+fail(?:s)?\s+(?:then\s+)?([^\n,.;]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const trigger = this.normalizeEntity(match[1] || '');
            const steps = this.parseHandlerSteps(match[2] || '');
            if (trigger && steps.length > 0)
                handlers.push({ trigger, on: 'failure', steps });
        }
        return handlers;
    }
    parseHandlerSteps(raw) {
        const direct = this.parseSequenceSteps(raw);
        if (direct.length >= 1)
            return direct;
        return raw
            .replace(/然后|接着/gi, '->')
            .replace(/\band\b/gi, '->')
            .split(/->|再|,/)
            .map((step) => step.trim().toLowerCase())
            .filter((step) => /^[\w\-./]+$/.test(step));
    }
    parseRetryPolicies(content) {
        const policies = [];
        let match;
        const enPattern = /retry\s+([\w\-./]+)\s+(\d+)\s+times(?:\s+with\s+backoff\s+([\w\-./]+))?/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const maxAttempts = Number(match[2] || 0);
            const backoff = match[3]?.toLowerCase();
            if (target && maxAttempts > 0)
                policies.push({ target, maxAttempts, backoff });
        }
        const cnPattern = /重试\s*([\w\-./]+)\s*(\d+)\s*次(?:.*?退避\s*([\w\-./]+))?/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const maxAttempts = Number(match[2] || 0);
            const backoff = match[3]?.toLowerCase();
            if (target && maxAttempts > 0)
                policies.push({ target, maxAttempts, backoff });
        }
        return policies;
    }
    parseMergePoints(content) {
        const mergePoints = [];
        let match;
        const enPattern = /merge\s+([\w\-./]+)\s+and\s+([\w\-./]+)\s+(?:before|into)\s+([\w\-./]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const left = this.normalizeEntity(match[1] || '');
            const right = this.normalizeEntity(match[2] || '');
            const into = this.normalizeEntity(match[3] || '');
            if (left && right && into)
                mergePoints.push({ into, branches: [left, right] });
        }
        const cnPattern = /合并\s*([\w\-./]+)\s*和\s*([\w\-./]+)\s*(?:后进入|到|再到)\s*([\w\-./]+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const left = this.normalizeEntity(match[1] || '');
            const right = this.normalizeEntity(match[2] || '');
            const into = this.normalizeEntity(match[3] || '');
            if (left && right && into)
                mergePoints.push({ into, branches: [left, right] });
        }
        return mergePoints;
    }
    parseBranchPoints(content) {
        const branchPoints = [];
        let match;
        const enPattern = /after\s+([\w\-./]+)\s+branch\s+to\s+([\w\-./]+)\s+and\s+([\w\-./]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const from = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (from && left && right)
                branchPoints.push({ from, branches: [left, right] });
        }
        const cnPattern = /([\w\-./]+)\s*后分支到\s*([\w\-./]+)\s*和\s*([\w\-./]+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const from = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (from && left && right)
                branchPoints.push({ from, branches: [left, right] });
        }
        return branchPoints;
    }
    parseStateTransitions(content) {
        const transitions = [];
        let match;
        const enPattern = /([\w\-./]+)\s+state\s+([\w\-./]+)\s*->\s*([\w\-./]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const entity = this.normalizeEntity(match[1] || '');
            const from = this.normalizeEntity(match[2] || '');
            const to = this.normalizeEntity(match[3] || '');
            if (entity && from && to)
                transitions.push({ entity, from, to });
        }
        const cnPattern = /([\w\-./]+)\s*状态\s*([\w\-./]+)\s*->\s*([\w\-./]+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const entity = this.normalizeEntity(match[1] || '');
            const from = this.normalizeEntity(match[2] || '');
            const to = this.normalizeEntity(match[3] || '');
            if (entity && from && to)
                transitions.push({ entity, from, to });
        }
        return transitions;
    }
    parsePolicyExecutors(content) {
        const executors = [];
        let match;
        const enPattern = /use\s+([\w\-./]+)\s+policy\s+for\s+([\w\-./]+)(?:\s+with\s+([\w\-./]+))?/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const policy = this.normalizeEntity(match[1] || '');
            const target = this.normalizeEntity(match[2] || '');
            const config = match[3]?.toLowerCase();
            if (policy && target)
                executors.push({ policy, target, config });
        }
        const cnPattern = /对\s*([\w\-./]+)\s*使用\s*([\w\-./]+)\s*策略(?:\s*配置\s*([\w\-./]+))?/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const policy = this.normalizeEntity(match[2] || '');
            const config = match[3]?.toLowerCase();
            if (policy && target)
                executors.push({ policy, target, config });
        }
        return executors;
    }
    parseExecutionGuards(content) {
        const guards = [];
        let match;
        const enPattern = /([\w\-./]+)\s+only if\s+([\w\-./]+)\s+passes/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const requirement = this.normalizeEntity(match[2] || '');
            if (target && requirement)
                guards.push({ target, requires: [requirement] });
        }
        const guardPattern = /guard\s+([\w\-./]+)\s+requires\s+([\w\-./]+)/gi;
        while ((match = guardPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const requirement = this.normalizeEntity(match[2] || '');
            if (target && requirement)
                guards.push({ target, requires: [requirement] });
        }
        const cnPattern = /([\w\-./]+)\s*只有\s*([\w\-./]+)\s*才能执行/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const requirement = this.normalizeEntity(match[2] || '');
            if (target && requirement)
                guards.push({ target, requires: [requirement] });
        }
        return guards;
    }
    parseStateMachines(content) {
        const machines = [];
        let match;
        const enPattern = /([\w\-./]+)\s+state\s+([\w\-./\s>,-]+(?:->\s*[\w\-./]+)+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const entity = this.normalizeEntity(match[1] || '');
            const states = (match[2] || '')
                .split(/->/)
                .map((item) => this.normalizeEntity(item || ''))
                .filter((item) => Boolean(item));
            if (entity && states.length >= 2)
                machines.push({ entity, states });
        }
        const cnPattern = /([\w\-./]+)\s*状态机\s*([\w\-./\s>,-]+(?:->\s*[\w\-./]+)+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const entity = this.normalizeEntity(match[1] || '');
            const states = (match[2] || '')
                .split(/->/)
                .map((item) => this.normalizeEntity(item || ''))
                .filter((item) => Boolean(item));
            if (entity && states.length >= 2)
                machines.push({ entity, states });
        }
        return machines;
    }
    parsePolicyRuntime(content) {
        const runtimes = [];
        let match;
        const enPattern = /policy runtime\s+([\w\-./]+)\s+mode\s+([\w\-./]+)\s+for\s+([\w\-./]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const policy = this.normalizeEntity(match[1] || '');
            const mode = this.normalizeEntity(match[2] || '');
            const target = this.normalizeEntity(match[3] || '');
            if (policy && target)
                runtimes.push({ policy, mode: mode || undefined, target });
        }
        const cnPattern = /([\w\-./]+)\s*策略运行时\s*模式\s*([\w\-./]+)\s*作用于\s*([\w\-./]+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const policy = this.normalizeEntity(match[1] || '');
            const mode = this.normalizeEntity(match[2] || '');
            const target = this.normalizeEntity(match[3] || '');
            if (policy && target)
                runtimes.push({ policy, mode: mode || undefined, target });
        }
        return runtimes;
    }
    parseMergeConstraints(content) {
        const constraints = [];
        let match;
        const enPattern = /merge\s+into\s+([\w\-./]+)\s+requires\s+([\w\-./]+)\s+and\s+([\w\-./]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const into = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (into && left && right)
                constraints.push({ into, requires: [left, right] });
        }
        const cnPattern = /合并到\s*([\w\-./]+)\s*需要\s*([\w\-./]+)\s*和\s*([\w\-./]+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const into = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (into && left && right)
                constraints.push({ into, requires: [left, right] });
        }
        return constraints;
    }
    parseRuntimeValidation(content) {
        const validations = [];
        let match;
        const enPattern = /validate\s+([\w\-./]+)\s+with\s+([\w\-./]+)\s+and\s+([\w\-./]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (target && left && right)
                validations.push({ target, checks: [left, right] });
        }
        const cnPattern = /校验\s*([\w\-./]+)\s*使用\s*([\w\-./]+)\s*和\s*([\w\-./]+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (target && left && right)
                validations.push({ target, checks: [left, right] });
        }
        return validations;
    }
    parseExecutorBindings(content) {
        const bindings = [];
        let match;
        const enPattern = /execute\s+([\w\-./]+)\s+with\s+([\w\-./]+)(?:\s+mode\s+([\w\-./]+))?/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const target = this.normalizeEntity(match[1] || '');
            const executor = this.normalizeEntity(match[2] || '');
            const mode = this.normalizeEntity(match[3] || '') || undefined;
            if (target && executor)
                bindings.push({ target, executor, mode });
        }
        const cnPattern = /用\s*([\w\-./]+)\s*执行\s*([\w\-./]+)(?:\s*模式\s*([\w\-./]+))?/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const executor = this.normalizeEntity(match[1] || '');
            const target = this.normalizeEntity(match[2] || '');
            const mode = this.normalizeEntity(match[3] || '') || undefined;
            if (target && executor)
                bindings.push({ target, executor, mode });
        }
        return bindings;
    }
    parseMergePropagation(content) {
        const propagations = [];
        let match;
        const enPattern = /merge\s+into\s+([\w\-./]+)\s+propagates\s+([\w\-./]+)\s+and\s+([\w\-./]+)/gi;
        while ((match = enPattern.exec(content)) !== null) {
            const into = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (into && left && right)
                propagations.push({ into, propagates: [left, right] });
        }
        const cnPattern = /合并到\s*([\w\-./]+)\s*传播\s*([\w\-./]+)\s*和\s*([\w\-./]+)/gi;
        while ((match = cnPattern.exec(content)) !== null) {
            const into = this.normalizeEntity(match[1] || '');
            const left = this.normalizeEntity(match[2] || '');
            const right = this.normalizeEntity(match[3] || '');
            if (into && left && right)
                propagations.push({ into, propagates: [left, right] });
        }
        return propagations;
    }
    dedupeCandidates(candidates) {
        const deduped = new Map();
        for (const candidate of candidates) {
            const key = [
                candidate.subject,
                candidate.predicate,
                candidate.objectValue.normalized || candidate.objectValue.raw,
                candidate.scope,
                candidate.validityKind || 'open',
                candidate.metadata?.conditionExpr || ''
            ].join('|');
            const existing = deduped.get(key);
            if (!existing || candidate.confidence > existing.confidence) {
                deduped.set(key, candidate);
            }
        }
        return Array.from(deduped.values());
    }
}

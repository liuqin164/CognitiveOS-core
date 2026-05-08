import { createHash } from 'crypto';
const CATEGORY_KEYS = [
    'summary',
    'entities',
    'facts',
    'relations',
    'causalLinks',
    'preferences',
    'emotionalSignals',
    'metaphorInterpretations',
    'contradictions',
    'unresolvedQuestions'
];
function hash(value) {
    return createHash('sha256').update(value).digest('hex');
}
function toArray(value) {
    return Array.isArray(value) ? value : [];
}
function confidenceOf(value) {
    if (!value || typeof value !== 'object')
        return 0.5;
    const confidence = Number(value.confidence);
    return Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5;
}
function evidenceOf(value) {
    if (!value || typeof value !== 'object')
        return [];
    return toArray(value.evidence);
}
export class DeepWriteMemoryOrchestrator {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async run(input) {
        if (!this.deps.config.enabled || this.deps.config.mode === 'off') {
            return { candidateCount: 0, skipped: true };
        }
        const recallQuery = [
            input.currentExchange.userText,
            input.currentExchange.assistantText || ''
        ].join('\n').trim();
        const recalled = this.deps.recall(recallQuery, {
            projectId: input.projectId,
            limit: this.deps.config.recallLimit,
            includeRawEvidence: true
        });
        let compilerInput = {
            projectId: input.projectId,
            sessionId: input.sessionId,
            currentExchange: input.currentExchange,
            recentTurns: input.recentTurns.slice(-this.deps.config.contextTurns),
            recalledMemory: {
                facts: recalled.compiledMemory?.facts || [],
                beliefs: recalled.compiledMemory?.beliefs || [],
                entities: [
                    ...(recalled.compiledMemory?.entityTimeline || []),
                    ...(recalled.profileSurface?.userProfile || []),
                    ...(recalled.profileSurface?.agentPersona || [])
                ],
                rawEvidence: (recalled.rawEvidence || []).map((item) => ({
                    neuronId: item.id || '',
                    content: item.content || '',
                    createdAt: item.metadata?.createdAt || 0,
                    tags: item.metadata?.tags || []
                })).filter((item) => item.neuronId && item.content)
            }
        };
        if (this.deps.config.redactionEnabled && this.deps.redactor) {
            compilerInput = this.deps.redactor.redact(compilerInput).value;
            for (const redactor of this.deps.customRedactors || []) {
                compilerInput = redactor.redact(compilerInput).value;
            }
        }
        const promptHash = hash(JSON.stringify(compilerInput));
        try {
            const compiled = await this.deps.compiler.compile(compilerInput);
            const outputHash = hash(compiled.rawOutput || JSON.stringify(compiled.output));
            const run = this.deps.store.insertRun({
                projectId: input.projectId,
                sessionId: input.sessionId,
                sourceNeuronIds: input.sourceNeuronIds,
                modelProvider: this.deps.modelProvider,
                modelName: this.deps.modelName,
                mode: this.deps.config.mode,
                promptHash,
                outputHash,
                status: 'succeeded'
            });
            const candidates = this.flattenCandidates(run.runId, compiled.output, compilerInput);
            const inserted = this.deps.store.insertCandidates(candidates);
            if (this.deps.config.mode === 'promote_guarded' && this.deps.promotionPolicy) {
                this.deps.promotionPolicy.promoteRun(run.runId);
            }
            return { runId: run.runId, candidateCount: inserted.length, skipped: false };
        }
        catch (error) {
            const run = this.deps.store.insertRun({
                projectId: input.projectId,
                sessionId: input.sessionId,
                sourceNeuronIds: input.sourceNeuronIds,
                modelProvider: this.deps.modelProvider,
                modelName: this.deps.modelName,
                mode: this.deps.config.mode,
                promptHash,
                outputHash: hash(''),
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
            });
            return { runId: run.runId, candidateCount: 0, skipped: false };
        }
    }
    flattenCandidates(runId, output, compilerInput) {
        const status = this.deps.config.mode === 'shadow' ? 'shadow' : 'candidate';
        const candidates = [];
        const roleByNeuronId = this.buildEvidenceRoleMap(compilerInput);
        for (const key of CATEGORY_KEYS) {
            for (const item of toArray(output[key])) {
                const evidence = evidenceOf(item).map((entry) => this.attachEvidenceRole(entry, roleByNeuronId));
                if (evidence.length === 0)
                    continue;
                candidates.push({
                    runId,
                    candidateType: key,
                    status,
                    confidence: confidenceOf(item),
                    content: item,
                    evidence
                });
            }
        }
        return candidates;
    }
    buildEvidenceRoleMap(input) {
        const roleByNeuronId = new Map();
        for (const item of input.recalledMemory.rawEvidence) {
            const raw = item;
            if (!raw.neuronId)
                continue;
            const tags = raw.tags || [];
            const role = tags.some((tag) => tag === 'turn_role:user')
                || /^User:/i.test(raw.content || '')
                ? 'user'
                : tags.some((tag) => tag === 'turn_role:assistant') || /^Assistant:/i.test(raw.content || '')
                    ? 'assistant'
                    : undefined;
            if (role)
                roleByNeuronId.set(raw.neuronId, role);
        }
        if (this.deps.config.mode !== 'off') {
            const userId = input.currentExchange.userTurnId;
            const assistantId = input.currentExchange.assistantTurnId;
            if (userId)
                roleByNeuronId.set(userId, 'user');
            if (assistantId)
                roleByNeuronId.set(assistantId, 'assistant');
        }
        return roleByNeuronId;
    }
    attachEvidenceRole(entry, roleByNeuronId) {
        if (typeof entry === 'string') {
            const role = roleByNeuronId.get(entry);
            return role ? { neuronId: entry, role } : entry;
        }
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
            return entry;
        const record = entry;
        const id = ['neuronId', 'neuron_id', 'sourceId', 'sourceNeuronId', 'id']
            .map((key) => record[key])
            .find((value) => typeof value === 'string' && value.trim().length > 0);
        const role = id ? roleByNeuronId.get(id) : undefined;
        return role && !record.role ? { ...record, role } : record;
    }
}

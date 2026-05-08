import { LocalSemanticCompiler } from '../engine/LocalSemanticCompiler.js';
const DEFAULT_CONFIG = {
    coverageThreshold: 0.6,
    topConfidenceThreshold: 0.4,
    maxSuggestedFollowups: 3
};
const COREFERENCE_CUES = [
    '之前',
    '上次',
    '刚才',
    '那个',
    '还记得',
    '刚说的',
    '前面提到',
    '你说过',
    'earlier',
    'you said',
    'remember when',
    'before',
    'previously',
    'we discussed'
];
const TEMPORAL_RELATIVE_CUES = [
    '昨天',
    '前天',
    '上周',
    '上个月',
    '之前',
    '上次',
    '刚才',
    'yesterday',
    'last week',
    'last month',
    'earlier',
    'previously',
    'before'
];
export class RecallSufficiencyGate {
    config;
    compiler = new LocalSemanticCompiler();
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    evaluate(input) {
        const compiled = this.compiler.compileQuery({ text: input.query, projectId: input.projectId });
        const targets = Array.from(new Set([
            ...compiled.entities.map((entity) => entity.text),
            ...compiled.temporalHints.map(String),
            ...compiled.relativeReferences
        ].map((item) => item.trim()).filter(Boolean)));
        const evidenceText = this.collectEvidenceText(input.layer1Result);
        const missing = targets.filter((target) => !textIncludes(evidenceText, target));
        const coverage = targets.length === 0 ? 1 : (targets.length - missing.length) / targets.length;
        const topConfidence = this.calculateTopConfidence(input.layer1Result);
        const coReferenceHit = COREFERENCE_CUES.some((cue) => textIncludes(input.query, cue));
        const topicalDriftHit = this.detectTopicalDrift(input.query, input.recentTurns);
        const reasons = [];
        if (coReferenceHit)
            reasons.push('coreference_cue');
        if (topicalDriftHit)
            reasons.push('topical_drift');
        if (coverage < this.config.coverageThreshold)
            reasons.push('coverage_below_threshold');
        if (topConfidence < this.config.topConfidenceThreshold)
            reasons.push('top_confidence_below_threshold');
        const sufficient = reasons.length === 0;
        return {
            sufficient,
            reason: sufficient ? 'layer1_sufficient' : reasons.join('+'),
            signals: {
                coverage,
                topConfidence,
                coReferenceHit,
                topicalDriftHit
            },
            suggestedFollowupQueries: sufficient
                ? []
                : this.buildFollowups(input, missing, compiled.relativeReferences)
        };
    }
    calculateTopConfidence(result) {
        const facts = [...result.compiledMemory.facts]
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);
        if (facts.length === 0)
            return 0;
        return Math.min(1, Math.max(0, facts.reduce((sum, fact) => sum + fact.confidence, 0) / 3));
    }
    detectTopicalDrift(query, recentTurns) {
        if (!hasTemporalRelative(query))
            return false;
        const recentText = recentTurns.slice(-6).map((turn) => turn.content).join('\n');
        if (!recentText.trim())
            return true;
        return trigramJaccard(query, recentText) < 0.1;
    }
    buildFollowups(input, missing, relativeReferences) {
        const projectHint = input.projectId ? `project:${input.projectId}` : '';
        const suggestions = [];
        for (const item of missing)
            suggestions.push([item, projectHint].filter(Boolean).join(' '));
        const lastUser = [...input.recentTurns].reverse().find((turn) => turn.role === 'user');
        const nounPhrase = extractCorePhrase(lastUser?.content || input.query);
        if (nounPhrase)
            suggestions.push(`${nounPhrase} ${input.query}`.trim());
        for (const ref of relativeReferences)
            suggestions.push([ref, projectHint].filter(Boolean).join(' '));
        return Array.from(new Set(suggestions.map((item) => item.trim()).filter(Boolean)))
            .slice(0, this.config.maxSuggestedFollowups);
    }
    collectEvidenceText(result) {
        const parts = [
            ...result.compiledMemory.facts.flatMap((fact) => [
                fact.subject,
                fact.predicateFamily,
                fact.predicateValue || '',
                fact.object || '',
                fact.sourceText
            ]),
            ...result.compiledMemory.entityTimeline.flatMap((item) => [
                item.canonicalName,
                item.type,
            ]),
            ...result.rawEvidence.map((neuron) => neuron.content),
            ...(result.summaries || []).map((summary) => summary.text)
        ];
        return parts.join('\n').toLowerCase();
    }
}
function textIncludes(text, needle) {
    return text.toLowerCase().includes(needle.toLowerCase());
}
function hasTemporalRelative(query) {
    return TEMPORAL_RELATIVE_CUES.some((cue) => textIncludes(query, cue));
}
function trigrams(text) {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalized.length < 3)
        return new Set(normalized ? [normalized] : []);
    const grams = new Set();
    for (let i = 0; i <= normalized.length - 3; i++)
        grams.add(normalized.slice(i, i + 3));
    return grams;
}
function trigramJaccard(a, b) {
    const left = trigrams(a);
    const right = trigrams(b);
    if (left.size === 0 && right.size === 0)
        return 1;
    let intersection = 0;
    for (const item of left)
        if (right.has(item))
            intersection += 1;
    return intersection / (left.size + right.size - intersection);
}
function extractCorePhrase(text) {
    const tokens = text
        .replace(/[^\p{L}\p{N}_\-\u4e00-\u9fa5\s]/gu, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !COREFERENCE_CUES.includes(token.toLowerCase()));
    return tokens.slice(0, 4).join(' ');
}

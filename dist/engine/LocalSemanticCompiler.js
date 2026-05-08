import { randomUUID } from 'crypto';
import { classifyIssueFamilies, extractConditionHints, extractDeviceCandidate, extractIssueHints, extractOwnershipSignals, extractProjectCandidate, extractProjectLinks, extractRelativeReferences, extractTemporalHints, inferEntityTypeFromText, isOwnershipSignal, normalizeLexiconText } from '../lexicon/coreMemoryLexicon.js';
export class LocalSemanticCompiler {
    compileMemory(input) {
        return this.compile('memory', input.text);
    }
    compileQuery(input) {
        return this.compile('query', input.text);
    }
    mergeIntoSemantics(base, compilation) {
        return {
            ...base,
            entityHints: Array.from(new Set([...base.entityHints, ...compilation.entities.map((entity) => entity.text)])),
            conditionHints: Array.from(new Set([...base.conditionHints, ...compilation.conditionHints])),
            valueHints: Array.from(new Set([...base.valueHints, ...compilation.topics.map((topic) => topic.topic)]))
        };
    }
    compile(sourceType, text) {
        const normalized = normalizeLexiconText(text);
        const lowered = normalized.toLowerCase();
        const entities = [];
        const topics = [];
        const temporalHints = [];
        const conditionHints = [];
        const issueHints = [];
        const ownershipSignals = [];
        const relativeReferences = [];
        const projectLinks = [];
        const tags = new Set();
        const pushEntity = (value, type, confidence) => {
            if (!value)
                return;
            const textValue = value.trim();
            if (!textValue)
                return;
            if (entities.some((entity) => entity.text === textValue && entity.type === type))
                return;
            entities.push({ text: textValue, type, confidence });
        };
        const primaryEntityCandidate = extractDeviceCandidate(normalized) || extractProjectCandidate(normalized);
        const primaryEntityType = primaryEntityCandidate ? inferEntityTypeFromText(primaryEntityCandidate) : undefined;
        if (primaryEntityCandidate && primaryEntityType) {
            pushEntity(primaryEntityCandidate, primaryEntityType, 0.94);
            tags.add(primaryEntityType);
        }
        for (const pattern of extractOwnershipSignals(normalized)) {
            ownershipSignals.push(pattern.trim());
            tags.add('ownership');
        }
        for (const match of extractProjectLinks(normalized)) {
            pushEntity(match, 'project', 0.9);
            tags.add('project');
            projectLinks.push(match.trim());
        }
        const ownershipProjectIssuePattern = isOwnershipSignal(lowered)
            && classifyIssueFamilies(lowered).length > 0
            && Boolean(extractProjectCandidate(normalized) || primaryEntityType === 'device');
        if (ownershipProjectIssuePattern) {
            tags.add('compound_memory');
            topics.push({ topic: 'compound_memory', confidence: 0.82 });
        }
        const apiMatch = normalized.match(/https?:\/\/[^\s,，。]+/i)?.[0];
        if (apiMatch) {
            topics.push({ topic: 'api', confidence: 0.82 });
            tags.add('endpoint');
        }
        const issueFamilies = classifyIssueFamilies(normalized);
        if (issueFamilies.length > 0) {
            topics.push({ topic: 'issue', confidence: 0.84 });
            tags.add('issue');
            const issueMatches = extractIssueHints(normalized);
            for (const issue of issueMatches)
                issueHints.push(issue.trim());
            for (const family of issueFamilies) {
                topics.push({ topic: family, confidence: 0.78 });
            }
        }
        temporalHints.push(...extractTemporalHints(normalized));
        for (const match of extractConditionHints(normalized)) {
            conditionHints.push(match.trim());
            tags.add('conditional');
        }
        const relativeRefs = extractRelativeReferences(normalized);
        if (relativeRefs.length > 0) {
            tags.add('relative_reference');
            for (const ref of relativeRefs)
                relativeReferences.push(ref.trim());
        }
        const confidence = Math.min(0.98, 0.45
            + Math.min(entities.length, 3) * 0.14
            + Math.min(topics.length, 3) * 0.08
            + Math.min(temporalHints.length, 2) * 0.08
            + Math.min(conditionHints.length, 2) * 0.06
            + Math.min(issueHints.length, 2) * 0.05
            + Math.min(ownershipSignals.length, 1) * 0.05);
        return {
            runId: `sem-${randomUUID()}`,
            sourceType,
            entities,
            topics: Array.from(new Map(topics.map((topic) => [topic.topic, topic])).values()),
            temporalHints: Array.from(new Set(temporalHints)),
            conditionHints: Array.from(new Set(conditionHints)),
            issueHints: Array.from(new Set(issueHints)),
            ownershipSignals: Array.from(new Set(ownershipSignals)),
            relativeReferences: Array.from(new Set(relativeReferences)),
            projectLinks: Array.from(new Set(projectLinks)),
            tags: Array.from(tags),
            confidence
        };
    }
}

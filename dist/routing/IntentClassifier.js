const TEMPORAL_RECALL_PATTERN = /last (?:week|month|day|time)|yesterday|ago|previously|before|earlier|上次|之前|上周|上个月/i;
const CORRECTION_CHECK_PATTERN = /change.*mind|update|correct|fix|wrong|actually|no wait|wait no|改|纠正|更新/i;
const CROSS_DOMAIN_PATTERN = /related|connected|associated|everything about|all.*about|有关|相关/i;
const ENTITY_LOOKUP_PATTERN = /what is|who is|tell me about|what does.*do|describe|是什么|介绍/i;
const FACTUAL_RECALL_PATTERN = /what.*problem|what.*issue|what.*wrong|how.*doing|status|有什么问题|状态/i;
const CROSS_DOMAIN_TOPIC_GROUPS = {
    connectivity: /\bbluetooth\b|\bwifi\b|\bnetwork\b|蓝牙|网络/i,
    work: /\bproject\b|\bsdk\b|\bfeature\b|\btask\b|项目|功能/i,
    hardware: /\bdevice\b|\bearphone\b|\bheadphone\b|\bphone\b|\blaptop\b|设备|耳机|手机|电脑/i,
    aggregate: /\bthings\b|\beverything\b|\ball\b|\bdealing with\b|\bdealt with\b|所有|都有哪些/i
};
export class IntentClassifier {
    classify(query, options = {}) {
        const normalizedQuery = query.trim();
        const entityHint = this.extractEntityHint(normalizedQuery);
        const temporalHint = this.extractTemporalHint(normalizedQuery);
        if (TEMPORAL_RECALL_PATTERN.test(normalizedQuery)) {
            return {
                intentType: 'temporal_recall',
                entityHint,
                temporalHint,
                confidence: 0.95
            };
        }
        if (CORRECTION_CHECK_PATTERN.test(normalizedQuery)) {
            return {
                intentType: 'correction_check',
                entityHint,
                confidence: 0.9
            };
        }
        if (this.isCrossDomainQuery(normalizedQuery, options.projectId)) {
            return {
                intentType: 'cross_domain',
                entityHint,
                confidence: 0.8
            };
        }
        if (ENTITY_LOOKUP_PATTERN.test(normalizedQuery)) {
            return {
                intentType: 'entity_lookup',
                entityHint,
                confidence: 0.85
            };
        }
        if (FACTUAL_RECALL_PATTERN.test(normalizedQuery)) {
            return {
                intentType: 'factual_recall',
                entityHint,
                confidence: 0.82
            };
        }
        return {
            intentType: 'open_ended',
            entityHint,
            confidence: 0.5
        };
    }
    isCrossDomainQuery(query, projectId) {
        if (CROSS_DOMAIN_PATTERN.test(query)) {
            return true;
        }
        const matchedGroups = Object.entries(CROSS_DOMAIN_TOPIC_GROUPS)
            .filter(([, pattern]) => pattern.test(query))
            .map(([group]) => group);
        if (projectId && /\bproject\b|项目/i.test(query) && !matchedGroups.includes('work')) {
            matchedGroups.push('work');
        }
        const distinctGroups = new Set(matchedGroups);
        if (distinctGroups.size >= 2 && distinctGroups.has('aggregate')) {
            return true;
        }
        return (distinctGroups.has('connectivity') &&
            /\b(thing|things|stuff|history|dealing with|dealt with)\b|所有|都有哪些/i.test(query));
    }
    extractTemporalHint(query) {
        const match = query.match(/last (?:week|month|day|time)|yesterday|\d+\s+(?:days?|weeks?|months?|years?)\s+ago|previously|before|earlier|上次|之前|上周|上个月/i);
        return match?.[0];
    }
    extractEntityHint(query) {
        const candidates = [];
        const pushMatches = (pattern, groupIndex = 1) => {
            for (const match of query.matchAll(pattern)) {
                const value = match[groupIndex]?.trim();
                const index = match.index ?? Number.MAX_SAFE_INTEGER;
                if (value) {
                    candidates.push({ index, value });
                }
            }
        };
        pushMatches(/["']([^"']+)["']/g);
        pushMatches(/\b(?:my|our|the)\s+([A-Za-z0-9][A-Za-z0-9_-]*(?:\s+[A-Za-z0-9][A-Za-z0-9_-]*){0,3})/gi);
        pushMatches(/\b([A-Z][A-Za-z0-9_-]*(?:\s+[A-Z][A-Za-z0-9_-]*)*)\b/g);
        candidates.sort((left, right) => left.index - right.index);
        return candidates[0]?.value;
    }
}

export type CoreEntityType = 'device' | 'project' | 'person' | 'brand' | 'issue';
export type IssueFamily = 'connectivity_issue' | 'sound_issue' | 'performance_issue' | 'generic_issue';
export type ReferenceSignalKind = 'new_instance_signal' | 'update_instance_signal' | 'ambiguous_reference_signal';
export type BindingReplyIntentKind = 'approved' | 'rejected' | 'entity_selection';
export type CoreTemporalHint = 'today' | 'this_week' | 'this_month' | 'past_year' | 'around_half_year_ago';
export declare const ENTITY_TYPE_LEXICON: Record<CoreEntityType, readonly string[]>;
export declare const RELATION_PHRASE_MAP: {
    readonly owns: readonly ["我有一个", "我有个", "i own", "i have", "i got", "my"];
    readonly purchased: readonly ["买了一个", "又买了一个", "新买的", "重新买了", "第二个", "i bought", "i bought another", "i bought a new", "i got a new"];
    readonly has_issue: readonly ["有问题", "什么问题", "故障", "异常", "坏了", "断连", "杂音", "卡顿", "延迟", "闪屏", "issue", "disconnect", "noise", "lag", "slow", "connection lost", "flicker"];
    readonly worked_on: readonly ["做过", "负责过", "参与过", "worked on", "working on", "building", "we are building", "we're building", "developing", "maintaining", "shipping"];
    readonly likes: readonly ["喜欢", "i like"];
    readonly dislikes: readonly ["讨厌", "不喜欢", "i dislike"];
    readonly approved: readonly ["user approved"];
    readonly rejected: readonly ["user rejected"];
};
export declare const REFERENCE_SIGNAL_LEXICON: Record<ReferenceSignalKind, readonly string[]>;
export declare const REFERENCE_SYNONYMS: {
    readonly latest: readonly ["新的那个", "新的设备", "新买的设备", "这个设备", "那个设备", "这个项目", "那个项目", "新项目", "新的项目", "它", "新买的耳机", "这个耳机", "那个耳机", "the new one", "new one", "this one", "the current one", "this project", "the new project", "new project", "that project"];
    readonly previous: readonly ["之前那个", "前一个", "前一个设备", "旧设备", "前一个项目", "旧项目", "上一个项目", "前一个耳机", "旧耳机", "the previous one", "previous one", "the old one", "old one", "the previous project", "previous project", "old project"];
};
export declare const ENTITY_INSTANCE_SIGNAL_LEXICON: {
    readonly strongNew: readonly string[];
    readonly strongUpdate: readonly string[];
};
export declare const INTERACTION_EVENT_PREFIX: {
    readonly approved: "user approved";
    readonly rejected: "user rejected";
    readonly entitySelection: "user selected";
};
export declare const SHORT_REPLY_BINDING_LEXICON: {
    readonly approved: readonly ["好的", "好", "行", "可以", "继续", "yes", "ok", "okay", "sounds good", "continue", "go on"];
    readonly rejected: readonly ["不要", "不行", "算了", "先别这个", "先别", "no", "don't", "don't do that", "never mind", "forget it"];
    readonly entitySelection: readonly ["新的那个", "新的设备", "新买的设备", "这个设备", "那个设备", "这个项目", "那个项目", "新项目", "新的项目", "它", "新买的耳机", "这个耳机", "那个耳机", "the new one", "new one", "this one", "the current one", "this project", "the new project", "new project", "that project", "之前那个", "前一个", "前一个设备", "旧设备", "前一个项目", "旧项目", "上一个项目", "前一个耳机", "旧耳机", "the previous one", "previous one", "the old one", "old one", "the previous project", "previous project", "old project", "旧的那个", "就这个", "还是它", "that one", "this one", "the new one", "new one", "the previous one", "previous one", "the old one", "old one"];
};
export declare const PENDING_BINDING_PROMPT_PATTERNS: {
    readonly action: readonly [RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp];
    readonly entity: readonly [RegExp, RegExp, RegExp, RegExp, RegExp];
};
export declare const LONG_TERM_MEMORY_SIGNAL_TERMS: readonly ["项目", "喜欢", "讨厌", "决定", "必须", "不能", "买了", "修好了", "送人了", "在用", "workflow", "api", "database", "project", "issue", "prefer", "like", "dislike", "decide", "using", "fixed", "gave away"];
export declare const ISSUE_FAMILY_LEXICON: Record<IssueFamily, {
    keywords: readonly string[];
    negations?: readonly string[];
}>;
export declare const ISSUE_QUALIFIER_LEXICON: {
    readonly left: readonly ["左耳", "left ear"];
    readonly right: readonly ["右耳", "right ear"];
};
export declare function normalizeLexiconText(text: string): string;
export declare function includesLexiconTerm(text: string, terms: readonly string[]): boolean;
export declare function inferEntityTypeFromText(text: string): CoreEntityType | undefined;
export declare function extractRelativeReferences(text: string): string[];
export declare function classifyIssueFamilies(text: string): IssueFamily[];
export declare function detectIssueQualifier(text: string): 'left' | 'right' | 'generic';
export declare function inferIssueValue(text: string): string;
export declare function hasIssueSignal(text: string): boolean;
export declare function isStrongNewInstanceSignal(text: string): boolean;
export declare function isStrongUpdateInstanceSignal(text: string): boolean;
export declare function matchBindingReplyIntent(text: string): {
    kind: BindingReplyIntentKind;
    reference?: string;
} | null;
export declare function isBindFirstShortReply(text: string): boolean;
export declare function detectPendingBindingPromptType(text: string): 'action' | 'entity' | 'question' | null;
export declare function hasLongTermMemorySignal(text: string): boolean;
export declare function extractIssueHints(text: string): string[];
export declare function extractLatestIssueReference(text: string): {
    reference: string;
    issue: string;
} | null;
export declare function extractIssueRankingTokensFromText(text: string): string[];
export declare function extractDeviceCandidate(text: string): string | undefined;
export declare function extractDeviceAliasCandidates(text: string): string[];
export declare function isOwnershipSignal(text: string): boolean;
export declare function extractOwnershipSignals(text: string): string[];
export declare function isPurchaseSignal(text: string): boolean;
export declare function isWorkedOnSignal(text: string): boolean;
export declare function extractProjectCandidate(text: string): string | undefined;
export declare function extractProjectLinks(text: string): string[];
export declare function extractProjectAliasCandidates(text: string): string[];
export declare function extractConditionHints(text: string): string[];
export declare function extractTemporalHints(text: string): CoreTemporalHint[];
export declare function extractPreference(text: string): {
    kind: 'like' | 'dislike';
    target: string;
} | null;
export declare function extractNegativePreferenceCue(text: string): {
    kind: 'dislike';
    target: string;
} | null;
export declare function extractExplicitNamedEntityCandidate(text: string): string | null;
export declare function extractApprovedArchiveProject(text: string): string | null;
export declare function inferReferenceType(reference: string, query: string): CoreEntityType | undefined;
export declare function isLatestReference(reference: string): boolean;
export declare function isPreviousReference(reference: string): boolean;
//# sourceMappingURL=coreMemoryLexicon.d.ts.map
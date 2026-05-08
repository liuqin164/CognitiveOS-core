export declare const EN_ENTITY_TYPE_TERMS: {
    readonly device: readonly ["keyboard", "mouse", "monitor", "device", "earbuds", "bluetooth earbuds", "headset", "earphone", "earphones"];
    readonly project: readonly ["project", "repo", "repository", "sdk", "library", "platform", "api"];
    readonly person: readonly ["they", "user"];
    readonly brand: readonly ["apple", "sony", "logitech", "razer", "dell", "brand", "framework", "library"];
    readonly issue: readonly ["issue", "bug"];
};
export declare const EN_RELATION_PHRASES: {
    readonly owns: readonly ["i own", "i have", "i got", "my"];
    readonly purchased: readonly ["i bought", "i bought another", "i bought a new", "i got a new"];
    readonly has_issue: readonly ["issue", "disconnect", "noise", "lag", "slow", "connection lost", "flicker"];
    readonly worked_on: readonly ["worked on", "working on", "building", "we are building", "we're building", "developing", "maintaining", "shipping"];
    readonly likes: readonly ["i like"];
    readonly dislikes: readonly ["i dislike"];
};
export declare const EN_REFERENCE_SIGNALS: {
    readonly newInstance: readonly ["i bought another", "i got a new"];
    readonly updateInstance: readonly ["that one", "the old one", "the new one", "the previous one", "previous one", "new one", "this project", "the new project", "the previous project"];
    readonly ambiguous: readonly ["it", "this one", "that thing", "this project", "that project"];
    readonly latest: readonly ["the new one", "new one", "this one", "the current one", "this project", "the new project", "new project", "that project"];
    readonly previous: readonly ["the previous one", "previous one", "the old one", "old one", "the previous project", "previous project", "old project"];
};
export declare const EN_SHORT_REPLY_BINDING: {
    readonly approved: readonly ["yes", "ok", "okay", "sounds good", "continue", "go on"];
    readonly rejected: readonly ["no", "don't", "don't do that", "never mind", "forget it"];
    readonly entitySelection: readonly ["that one", "this one", "the new one", "new one", "the previous one", "previous one", "the old one", "old one"];
};
export declare const EN_PENDING_PATTERNS: {
    readonly action: readonly [RegExp, RegExp, RegExp];
    readonly entity: readonly [RegExp, RegExp];
};
export declare const EN_LONG_TERM_SIGNAL_TERMS: readonly ["workflow", "api", "database", "project", "issue", "prefer", "like", "dislike", "decide", "using", "fixed", "gave away"];
export declare const EN_ISSUE_KEYWORDS: {
    readonly connectivity: readonly ["disconnect", "connection lost"];
    readonly sound: readonly ["noise"];
    readonly performance: readonly ["lag", "slow", "flicker"];
};
export declare const EN_ISSUE_QUALIFIERS: {
    readonly left: readonly ["left ear"];
    readonly right: readonly ["right ear"];
};
//# sourceMappingURL=en.d.ts.map
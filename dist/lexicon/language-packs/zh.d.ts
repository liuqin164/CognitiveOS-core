export declare const ZH_ENTITY_TYPE_TERMS: {
    readonly device: readonly ["耳机", "键盘", "鼠标", "显示器"];
    readonly project: readonly ["项目"];
    readonly person: readonly ["我", "用户", "他", "她"];
    readonly brand: readonly ["品牌", "框架", "库"];
    readonly issue: readonly ["问题", "故障", "异常"];
};
export declare const ZH_RELATION_PHRASES: {
    readonly owns: readonly ["我有一个", "我有个"];
    readonly purchased: readonly ["买了一个", "又买了一个", "新买的", "重新买了", "第二个"];
    readonly has_issue: readonly ["有问题", "什么问题", "故障", "异常", "坏了", "断连", "杂音", "卡顿", "延迟", "闪屏"];
    readonly worked_on: readonly ["做过", "负责过", "参与过"];
    readonly likes: readonly ["喜欢"];
    readonly dislikes: readonly ["讨厌", "不喜欢"];
};
export declare const ZH_REFERENCE_SIGNALS: {
    readonly newInstance: readonly ["新买的", "新的那个", "第二个", "刚入手一个", "又买了一个"];
    readonly updateInstance: readonly ["那个耳机", "那个设备", "那个项目", "前一个", "之前那个", "它后来", "旧的"];
    readonly ambiguous: readonly ["它", "这个", "那个东西", "那个设备"];
    readonly latest: readonly ["新的那个", "新的设备", "新买的设备", "这个设备", "那个设备", "这个项目", "那个项目", "新项目", "新的项目", "它", "新买的耳机", "这个耳机", "那个耳机"];
    readonly previous: readonly ["之前那个", "前一个", "前一个设备", "旧设备", "前一个项目", "旧项目", "上一个项目", "前一个耳机", "旧耳机"];
};
export declare const ZH_SHORT_REPLY_BINDING: {
    readonly approved: readonly ["好的", "好", "行", "可以", "继续"];
    readonly rejected: readonly ["不要", "不行", "算了", "先别这个", "先别"];
    readonly entitySelection: readonly ["旧的那个", "就这个", "还是它"];
};
export declare const ZH_PENDING_PATTERNS: {
    readonly action: readonly [RegExp, RegExp, RegExp, RegExp];
    readonly entity: readonly [RegExp, RegExp, RegExp];
};
export declare const ZH_LONG_TERM_SIGNAL_TERMS: readonly ["项目", "喜欢", "讨厌", "决定", "必须", "不能", "买了", "修好了", "送人了", "在用"];
export declare const ZH_ISSUE_KEYWORDS: {
    readonly connectivity: readonly ["断连", "掉线", "配对失败"];
    readonly sound: readonly ["杂音", "爆音", "无声", "收音发闷", "电流声"];
    readonly performance: readonly ["卡顿", "延迟", "慢", "不稳定", "闪屏"];
};
export declare const ZH_ISSUE_QUALIFIERS: {
    readonly left: readonly ["左耳"];
    readonly right: readonly ["右耳"];
};
//# sourceMappingURL=zh.d.ts.map
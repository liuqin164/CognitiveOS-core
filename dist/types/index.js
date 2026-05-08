// ============================================
// 核心类型定义 - Agent Brain
// ============================================
export var ContextFusionPath;
(function (ContextFusionPath) {
    ContextFusionPath["COMPILED_ONLY"] = "compiled_only";
    ContextFusionPath["RAW_ONLY"] = "raw_only";
    ContextFusionPath["COMPILED_PLUS_RAW"] = "compiled_plus_raw";
    ContextFusionPath["CONFLICT_RESOLVED"] = "conflict_resolved";
})(ContextFusionPath || (ContextFusionPath = {}));
export var FusionResolutionReason;
(function (FusionResolutionReason) {
    FusionResolutionReason["COMPILED_WINS"] = "compiled_wins";
    FusionResolutionReason["RAW_WINS"] = "raw_wins";
    FusionResolutionReason["TRUST_SCORE_HIGHER"] = "trust_score_higher";
    FusionResolutionReason["RECENCY_WINS"] = "recency_wins";
})(FusionResolutionReason || (FusionResolutionReason = {}));
// -------------------- 降级模式 --------------------
export var BrainMode;
(function (BrainMode) {
    BrainMode["FULL"] = "FULL";
    BrainMode["NO_SYNAPSE"] = "NO_SYNAPSE";
    BrainMode["TEXT_ONLY"] = "TEXT_ONLY";
})(BrainMode || (BrainMode = {}));

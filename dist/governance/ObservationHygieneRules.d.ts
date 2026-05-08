export interface HygieneRule {
    id: string;
    description: string;
    check(content: string, meta: {
        sourceType?: string;
        url?: string;
    }): boolean;
}
export declare const HYGIENE_RULES: HygieneRule[];
export declare function applyHygieneRules(content: string, meta: {
    sourceType?: string;
    url?: string;
}, rules?: HygieneRule[]): {
    shouldFilter: boolean;
    triggeredRule?: string;
};
//# sourceMappingURL=ObservationHygieneRules.d.ts.map
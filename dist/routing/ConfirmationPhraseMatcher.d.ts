export interface ConfirmationMatchResult {
    action: 'approve' | 'reject';
    subject?: string;
}
export declare class ConfirmationPhraseMatcher {
    matchConfirmation(message: string): ConfirmationMatchResult | null;
    private extractSubject;
}
//# sourceMappingURL=ConfirmationPhraseMatcher.d.ts.map
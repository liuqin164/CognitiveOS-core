const APPROVE_SUBJECT_PATTERNS = [
    /^(?:确认|批准|同意|允许|执行)\s*(?:部署|发布|运行|执行|启动)?\s*[:：]?\s*(.+?)\s*$/i,
    /^(?:approve|confirm|authorize)\s+(?:the\s+)?(?:deploy(?:ment)?|release|run|execution)?\s*[: ]\s*(.+?)\s*$/i,
    /^(?:yes|go\s+ahead|proceed)\s+(?:with\s+)?(.+?)\s*$/i
];
const REJECT_SUBJECT_PATTERNS = [
    /^(?:取消|拒绝|停止|终止|撤销|不要)\s*(?:部署|发布|运行|执行|任务)?\s*[:：]?\s*(.+?)\s*$/i,
    /^(?:reject|deny|cancel|abort|decline|stop)\s+(?:the\s+)?(?:deployment|release|run|execution|task)?\s*[: ]\s*(.+?)\s*$/i,
    /^(?:no|don'?t)\s+(?:do|run|deploy|execute)?\s*(.+?)\s*$/i
];
const SUBJECT_STRIP_PATTERN = /^(?:that|it|the|这个|那个|本次|这次|该)\s+|[\s，。,.:：;；!?！]+$/g;
const BARE_CONFIRMATION_PATTERN = /^(?:是|对|好|嗯|确认|没错|正确|否|不是|不|错|取消|放弃|yes|no|y|n)[\s。，！!?.]*$/i;
export class ConfirmationPhraseMatcher {
    matchConfirmation(message) {
        const normalizedMessage = message.trim();
        if (!normalizedMessage) {
            return null;
        }
        if (BARE_CONFIRMATION_PATTERN.test(normalizedMessage)) {
            return null;
        }
        const approveSubject = this.extractSubject(normalizedMessage, APPROVE_SUBJECT_PATTERNS);
        if (approveSubject !== null) {
            return approveSubject ? { action: 'approve', subject: approveSubject } : { action: 'approve' };
        }
        const rejectSubject = this.extractSubject(normalizedMessage, REJECT_SUBJECT_PATTERNS);
        if (rejectSubject !== null) {
            return rejectSubject ? { action: 'reject', subject: rejectSubject } : { action: 'reject' };
        }
        return null;
    }
    extractSubject(message, patterns) {
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (!match) {
                continue;
            }
            const subject = match[1]?.replace(SUBJECT_STRIP_PATTERN, '').trim();
            return subject || '';
        }
        return null;
    }
}

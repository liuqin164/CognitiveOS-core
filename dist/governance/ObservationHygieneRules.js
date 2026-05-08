export const HYGIENE_RULES = [
    {
        id: 'empty_content',
        description: 'Filter empty or whitespace-only content',
        check: (content) => content.trim().length === 0
    },
    {
        id: 'duplicate_noise',
        description: 'Filter content that is only repeated characters',
        check: (content) => /^(.)\1{9,}$/.test(content.trim())
    },
    {
        id: 'shell_noise',
        description: 'Filter shell outputs that are only exit codes or prompts',
        check: (content, meta) => meta.sourceType === 'shell_exec_output' && /^(\$\s*|>\s*|exit\s*\d*\s*)$/.test(content.trim())
    },
    {
        id: 'low_information_web',
        description: 'Filter web content shorter than 20 chars that is likely a redirect or error page',
        check: (content, meta) => meta.sourceType === 'web_fetch_general' && content.trim().length < 20
    }
];
export function applyHygieneRules(content, meta, rules = HYGIENE_RULES) {
    const triggered = rules.find((rule) => rule.check(content, meta));
    return triggered
        ? { shouldFilter: true, triggeredRule: triggered.id }
        : { shouldFilter: false };
}

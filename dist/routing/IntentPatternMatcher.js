export const SYSTEM_INTENT_PRIORITY = [
    'system_command.approve',
    'system_command.cancel_task',
    'system_command.mark_permanent',
    'system_command.mark_important',
    'system_command.unmark_important',
    'system_command.reject',
    'system_command.resume',
    'system_confirmation.yes_no',
    'system_query.tasks',
    'system_query.contradictions',
    'system_query.approvals',
    'system_query.capabilities',
    'system_query.environment',
    'system_query.models',
    'system_query.file_assets',
    'system_query.self_manifest',
    'system_query.memory_recent',
    'system_query.memory_search',
    'system_query.important_memories',
    'system_query.context',
    'system_query.trace'
];
export const SYSTEM_INTENT_PATTERNS = {
    'system_query.tasks': [
        /现在.*(有什么|哪些).*(任务|工作)/,
        /任务.*(状态|列表|进度|有哪些)/,
        /有.*(哪些|什么).*(任务|工作).*(?:在)?运行/,
        /list\s+tasks?/i,
        /what\s+tasks?\s+(are\s+)?(running|pending|active)/i,
        /show\s+(me\s+)?tasks?/i,
        /task\s+(status|list|progress)/i
    ],
    'system_query.approvals': [
        /有.*(什么|哪些).*(需要|待).*(确认|审批|批准)/,
        /待确认|待审批|等待审批/,
        /pending\s+approvals?/i,
        /what\s+needs?\s+(my\s+)?approval/i,
        /show\s+(me\s+)?(pending\s+)?approvals?/i,
        /what\s+is\s+waiting\s+for\s+approval/i
    ],
    'system_query.contradictions': [
        /有没有.*(矛盾|冲突|待确认)/,
        /我需要确认什么/,
        /记忆有没有冲突/,
        /contradiction|pending.*memory|conflicting.*facts/i
    ],
    'system_query.capabilities': [
        /你.*(能|可以).*(做|干|执行)什么/,
        /有.*(哪些|什么).*(能力|功能|工具)/,
        /what\s+can\s+you\s+do/i,
        /list\s+(your\s+)?capabilities/i,
        /available\s+(tools?|capabilities)/i,
        /what\s+tools?\s+do\s+you\s+have/i
    ],
    'system_query.environment': [
        /你.*(当前|现在).*(环境|workspace|工作区|目录)/i,
        /当前.*(环境|workspace|工作区|目录)/i,
        /你.*能.*联网吗/,
        /你.*能不能.*(联网|上网|访问网络)/,
        /你.*是否.*(可以|能).*(联网|上网|访问网络)/,
        /有没有.*(网络|联网).*(权限|能力)/,
        /网络.*(可用|能用|权限)/,
        /是否可以上网/,
        /can\s+you\s+access\s+(the\s+)?internet/i,
        /can\s+you\s+(browse|access\s+the\s+web|use\s+the\s+internet)/i,
        /do\s+you\s+have\s+(network|internet)\s+access/i,
        /current\s+(environment|workspace|working\s+directory)/i
    ],
    'system_query.models': [
        /你.*(用|可用).*(什么|哪些).*(模型|model)/i,
        /当前.*(模型|model).*(配置|能力)/i,
        /available\s+models?/i,
        /model\s+(capabilities|configuration|config)/i
    ],
    'system_query.file_assets': [
        /你.*能.*(读|处理|索引).*(pdf|docx|excel|xlsx|文件|视频|音频)/i,
        /(pdf|docx|excel|xlsx|文件|视频|音频).*(支持|能不能|可以吗)/i,
        /file\s+asset/i,
        /can\s+you\s+(read|index|process).*(pdf|docx|excel|xlsx|video|audio|files?)/i
    ],
    'system_query.self_manifest': [
        /自我清单|运行时自我|self\s+manifest/i,
        /你.*知道.*自己.*(能|会|环境)/,
        /runtime\s+self/i
    ],
    'system_query.memory_recent': [
        /最近.*(记住|存储|记录|记了).*(什么|哪些)/,
        /你.*(记住|记了).*(什么|哪些)/,
        /what\s+did\s+you\s+remember/i,
        /recent\s+memories?/i,
        /show\s+(me\s+)?recent\s+memory/i,
        /what\s+have\s+you\s+stored\s+recently/i
    ],
    'system_query.memory_search': [
        /我.*(之前|以前|上次|曾经).*(提过|说过|提到).*/,
        /你.*(记得|知道).*(关于|有关).*吗/,
        /did\s+I\s+(ever\s+)?(mention|say|talk\s+about)/i,
        /do\s+you\s+remember\s+/i,
        /search\s+(memory|memories)\s+for/i,
        /have\s+I\s+(mentioned|said)\s+/i
    ],
    'system_query.important_memories': [
        /有哪些重要的记忆/,
        /我标记了什么/,
        /哪些是.*永久记忆/,
        /我标记了哪些重要记忆/,
        /list.*important.*memories/i,
        /what.*have.*you.*pinned/i
    ],
    'system_query.context': [
        /你.*(这轮|这次|当前).*(用了|使用了|消耗了).*(多少|几个).*(上下文|token|词元)/,
        /当前.*(上下文|context).*(用量|大小|长度)/,
        /这次.*消耗了.*(token|词元)/i,
        /how\s+much\s+context/i,
        /context\s+(window\s+)?(usage|size|length)/i,
        /token\s+count/i,
        /how\s+many\s+tokens?\s+(did\s+you\s+use|are\s+used)/i
    ],
    'system_query.trace': [
        /你.*(为什么|为何|怎么).*(这么|这样|如此).*(决定|判断|选择)/,
        /这个决定.*(原因|依据|理由)/,
        /解释.*(一下|你的).*(决定|判断)/,
        /why\s+did\s+you\s+(decide|choose|pick)/i,
        /explain\s+your\s+(decision|reasoning|choice)/i,
        /show\s+(me\s+)?the\s+trace/i,
        /why\s+was\s+that\s+chosen/i
    ],
    'system_command.approve': [
        /^(确认|批准|同意|执行|允许)(?![\s。，！!?.]*$)[^，。!?]*$/,
        /^(好的|好|行|可以)[，。\s]*(就这样|执行|部署|继续)/,
        /^approve\b/i,
        /^yes[,\s]+(deploy|run|execute|proceed)/i,
        /^(go\s+ahead|confirmed?|authorized?)\b/i,
        /^(please\s+)?proceed\b/i
    ],
    'system_command.reject': [
        /^(取消|拒绝|不要|停止|终止|撤销)(?![\s。，！!?.]*$)[^，。!?]*$/,
        /^(不|别|算了)[，。\s]+(执行|部署|继续|这样|做)/,
        /^(reject|deny|cancel|abort|decline)\b/i,
        /^(no|nope)[,\s]+(don'?t|cancel|stop)/i,
        /^(stop\s+that|cancel\s+it)\b/i
    ],
    'system_command.resume': [
        /^(继续|恢复|接着|继续执行)[^，。!?]*$/,
        /继续.*(刚才|之前|上次|未完成的)/,
        /^(resume|continue|pick\s+up\s+where)/i,
        /resume\s+(the\s+)?(last\s+)?task/i,
        /continue\s+(the\s+)?previous\s+task/i
    ],
    'system_command.cancel_task': [
        /停掉.*(任务|工作)/,
        /停止.*(任务|工作)/,
        /取消.*(任务|工作).*(id|编号)?[A-Za-z0-9-]*/,
        /cancel\s+task\s+/i,
        /stop\s+task\s+/i,
        /kill\s+(task|job)\s+/i,
        /abort\s+(job|task)\s+/i
    ],
    'system_command.mark_important': [
        /记住这个.*(重要|不要忘)/,
        /这个(很|非常|相当)重要/,
        /这件事(要|需要)一直记着/,
        /mark.*as.*important/i,
        /remember.*this.*always/i,
        /don't.*forget.*this/i
    ],
    'system_command.mark_permanent': [
        /永久记住/,
        /永远记住/,
        /这个.*永远.*不能忘/,
        /remember.*permanently/i,
        /pin.*this.*memory/i
    ],
    'system_command.unmark_important': [
        /这个不用一直记/,
        /取消.*重要标记/,
        /可以忘掉这个/,
        /unpin.*memory/i,
        /this.*is.*no longer important/i
    ],
    'system_confirmation.yes_no': [
        /^(是|对|好|嗯|确认|没错|正确)[\s。，！!?.]*$/,
        /^(否|不是|不|错|取消|放弃)[\s。，！!?.]*$/,
        /^yes[\s!.?]*$/i,
        /^no[\s!.?]*$/i,
        /^(y|n)$/i
    ],
    reasoning_required: []
};
export class IntentPatternMatcher {
    patterns = SYSTEM_INTENT_PATTERNS;
    match(message) {
        const normalizedMessage = message.trim();
        if (!normalizedMessage) {
            return null;
        }
        for (const intent of SYSTEM_INTENT_PRIORITY) {
            const matchedPattern = this.patterns[intent].find((pattern) => pattern.test(normalizedMessage));
            if (matchedPattern) {
                return { intent, pattern: matchedPattern };
            }
        }
        return null;
    }
}

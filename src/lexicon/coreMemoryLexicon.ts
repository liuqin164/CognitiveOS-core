import {
  EN_ENTITY_TYPE_TERMS,
  EN_ISSUE_KEYWORDS,
  EN_ISSUE_QUALIFIERS,
  EN_LONG_TERM_SIGNAL_TERMS,
  EN_PENDING_PATTERNS,
  EN_REFERENCE_SIGNALS,
  EN_RELATION_PHRASES,
  EN_SHORT_REPLY_BINDING
} from './language-packs/en.js';
import {
  ZH_ENTITY_TYPE_TERMS,
  ZH_ISSUE_KEYWORDS,
  ZH_ISSUE_QUALIFIERS,
  ZH_LONG_TERM_SIGNAL_TERMS,
  ZH_PENDING_PATTERNS,
  ZH_REFERENCE_SIGNALS,
  ZH_RELATION_PHRASES,
  ZH_SHORT_REPLY_BINDING
} from './language-packs/zh.js';

export type CoreEntityType = 'device' | 'project' | 'person' | 'brand' | 'issue';
export type IssueFamily = 'connectivity_issue' | 'sound_issue' | 'performance_issue' | 'generic_issue';
export type ReferenceSignalKind = 'new_instance_signal' | 'update_instance_signal' | 'ambiguous_reference_signal';
export type BindingReplyIntentKind = 'approved' | 'rejected' | 'entity_selection';
export type CoreTemporalHint = 'today' | 'this_week' | 'this_month' | 'past_year' | 'around_half_year_ago';

export const ENTITY_TYPE_LEXICON: Record<CoreEntityType, readonly string[]> = {
  device: [...ZH_ENTITY_TYPE_TERMS.device, ...EN_ENTITY_TYPE_TERMS.device],
  project: [...ZH_ENTITY_TYPE_TERMS.project, ...EN_ENTITY_TYPE_TERMS.project],
  person: [...ZH_ENTITY_TYPE_TERMS.person, ...EN_ENTITY_TYPE_TERMS.person],
  brand: [...ZH_ENTITY_TYPE_TERMS.brand, ...EN_ENTITY_TYPE_TERMS.brand],
  issue: [...ZH_ENTITY_TYPE_TERMS.issue, ...EN_ENTITY_TYPE_TERMS.issue]
} as const;

export const RELATION_PHRASE_MAP = {
  owns: [...ZH_RELATION_PHRASES.owns, ...EN_RELATION_PHRASES.owns],
  purchased: [...ZH_RELATION_PHRASES.purchased, ...EN_RELATION_PHRASES.purchased],
  has_issue: [...ZH_RELATION_PHRASES.has_issue, ...EN_RELATION_PHRASES.has_issue],
  worked_on: [...ZH_RELATION_PHRASES.worked_on, ...EN_RELATION_PHRASES.worked_on],
  likes: [...ZH_RELATION_PHRASES.likes, ...EN_RELATION_PHRASES.likes],
  dislikes: [...ZH_RELATION_PHRASES.dislikes, ...EN_RELATION_PHRASES.dislikes],
  approved: ['user approved'],
  rejected: ['user rejected']
} as const;

export const REFERENCE_SIGNAL_LEXICON: Record<ReferenceSignalKind, readonly string[]> = {
  new_instance_signal: [...ZH_REFERENCE_SIGNALS.newInstance, ...EN_REFERENCE_SIGNALS.newInstance],
  update_instance_signal: [...ZH_REFERENCE_SIGNALS.updateInstance, ...EN_REFERENCE_SIGNALS.updateInstance],
  ambiguous_reference_signal: [...ZH_REFERENCE_SIGNALS.ambiguous, ...EN_REFERENCE_SIGNALS.ambiguous]
} as const;

export const REFERENCE_SYNONYMS = {
  latest: [...ZH_REFERENCE_SIGNALS.latest, ...EN_REFERENCE_SIGNALS.latest],
  previous: [...ZH_REFERENCE_SIGNALS.previous, ...EN_REFERENCE_SIGNALS.previous]
} as const;

export const ENTITY_INSTANCE_SIGNAL_LEXICON = {
  strongNew: REFERENCE_SIGNAL_LEXICON.new_instance_signal,
  strongUpdate: REFERENCE_SIGNAL_LEXICON.update_instance_signal
} as const;

export const INTERACTION_EVENT_PREFIX = {
  approved: 'user approved',
  rejected: 'user rejected',
  entitySelection: 'user selected'
} as const;

export const SHORT_REPLY_BINDING_LEXICON = {
  approved: [...ZH_SHORT_REPLY_BINDING.approved, ...EN_SHORT_REPLY_BINDING.approved],
  rejected: [...ZH_SHORT_REPLY_BINDING.rejected, ...EN_SHORT_REPLY_BINDING.rejected],
  entitySelection: [
    ...REFERENCE_SYNONYMS.latest,
    ...REFERENCE_SYNONYMS.previous,
    ...ZH_SHORT_REPLY_BINDING.entitySelection,
    ...EN_SHORT_REPLY_BINDING.entitySelection
  ]
} as const;

export const PENDING_BINDING_PROMPT_PATTERNS = {
  action: [
    ...ZH_PENDING_PATTERNS.action,
    ...EN_PENDING_PATTERNS.action
  ],
  entity: [
    ...ZH_PENDING_PATTERNS.entity,
    ...EN_PENDING_PATTERNS.entity
  ]
} as const;

export const LONG_TERM_MEMORY_SIGNAL_TERMS = [
  ...ZH_LONG_TERM_SIGNAL_TERMS,
  ...EN_LONG_TERM_SIGNAL_TERMS
] as const;

export const ISSUE_FAMILY_LEXICON: Record<IssueFamily, { keywords: readonly string[]; negations?: readonly string[] }> = {
  connectivity_issue: {
    keywords: [...ZH_ISSUE_KEYWORDS.connectivity, ...EN_ISSUE_KEYWORDS.connectivity]
  },
  sound_issue: {
    keywords: [...ZH_ISSUE_KEYWORDS.sound, ...EN_ISSUE_KEYWORDS.sound]
  },
  performance_issue: {
    keywords: [...ZH_ISSUE_KEYWORDS.performance, ...EN_ISSUE_KEYWORDS.performance]
  },
  generic_issue: {
    keywords: ['有问题', '什么问题', 'issue', '故障', '异常', '坏了']
  }
} as const;

export const ISSUE_QUALIFIER_LEXICON = {
  left: [...ZH_ISSUE_QUALIFIERS.left, ...EN_ISSUE_QUALIFIERS.left],
  right: [...ZH_ISSUE_QUALIFIERS.right, ...EN_ISSUE_QUALIFIERS.right]
} as const;

const DEVICE_SURFACE_PATTERN = /([A-Za-z0-9._+-]+(?:\s+[A-Za-z0-9._+-]+){0,4}\s+(?:headset|monitor|keyboard|mouse|earbuds?|earphones?)|bluetooth\s+(?:earbuds?|earphones?)|[A-Za-z0-9._+-]+(?:耳机|键盘|鼠标|显示器)|[\u4e00-\u9fa5A-Za-z0-9._+-]+(?:耳机|键盘|鼠标|显示器)|耳机|键盘|鼠标|显示器|headset|monitor|keyboard|mouse|earbuds?|earphones?)/gi;
const PROJECT_SURFACE_PATTERN = /([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,5}\s+(?:project|sdk|library|platform|api|repository|repo)|[\u4e00-\u9fa5A-Za-z0-9._-]+项目)/gi;

function collapseSurfaceWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function stripRepeatedPrefixes(value: string, patterns: RegExp[]): string {
  let current = collapseSurfaceWhitespace(value);
  for (let index = 0; index < 6; index += 1) {
    let changed = false;
    for (const pattern of patterns) {
      const next = current.replace(pattern, '').trim();
      if (next !== current) {
        current = collapseSurfaceWhitespace(next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return current;
}

function escapeLexiconRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanDeviceSurfaceCandidate(candidate: string, fullText?: string): string | undefined {
  const raw = collapseSurfaceWhitespace(candidate);
  const stripped = stripRepeatedPrefixes(candidate, [
    /^(?:my|our|the|an?|another)\s+/i,
    /^(?:一个|一副|一台|一部|个|副|台|部)\s*/i,
    /^(?:i\s+own(?:\s+(?:a|an))?|i\s+bought(?:\s+(?:a|an|another))?(?:\s+new)?|i\s+have(?:\s+(?:a|an))?|i\s+had(?:\s+(?:a|an))?|i\s+got(?:\s+(?:a|an))?(?:\s+new)?|i\s+used)\s+/i,
    /^(?:我(?:又)?买了(?:一个|一副)?|我有一个|我有个|我的|用了)\s*/i,
    /^(?:the\s+previous|previous|the\s+new|new|the\s+old|old|this|that)\s+/i,
    /^(?:前一个|之前那个|上一个|新的那个|新买的|旧的那个|旧的|旧|这个|那个)\s*/i
  ]);
  if (!stripped) return undefined;
  if (/\bproject\b|项目/i.test(stripped)) return undefined;
  if (/^(?:耳机|键盘|鼠标|显示器|bluetooth\s+(?:earbuds?|earphones?)|earbuds?|earphones?|keyboard|mouse|monitor|device|headset)$/i.test(stripped)) {
    if (fullText) {
      const hasOwnershipLead = /(?:i\s+own|i\s+bought|i\s+have|i\s+had|i\s+got|my\b|我(?:又)?买了|我有一个|我有个|我的)/i.test(fullText);
      if (hasOwnershipLead) return stripped;
      const escaped = escapeLexiconRegex(stripped);
      if (
        new RegExp(`(?:the\\s+previous|previous|the\\s+new|new|the\\s+old|old|this|that)\\s+${escaped}\\b`, 'i').test(fullText)
        || new RegExp(`(?:前一个|之前那个|上一个|新的那个|新买的|旧的那个|旧的|旧|这个|那个)\\s*${escaped}`, 'i').test(fullText)
      ) {
        return undefined;
      }
    }
    const hadRelativeLead = /^(?:the previous|previous|the new|new|the old|old|this|that|前一个|之前那个|上一个|新的那个|新买的|旧的那个|旧的|旧|这个|那个)\b/i.test(raw);
    return hadRelativeLead ? undefined : stripped;
  }
  return stripped;
}

function cleanProjectSurfaceCandidate(candidate: string): string | undefined {
  const stripped = stripRepeatedPrefixes(candidate, [
    /^(?:are\s+building(?:\s+(?:a|an|the))?)\s+/i,
    /^(?:the|an?|this|that)\s+/i,
    /^(?:for|in|during|on)\s+/i,
    /^(?:we\s+are\s+building|we're\s+building|worked on|working on|doing|building|developing|maintaining|shipping)\s+/i,
    /^(?:而且)?(?:还)?(?:做过|参与过|负责过|在做|在开发|开发|维护|跟进)\s*/i,
    /^(?:the\s+previous|previous|the\s+new|new|old)\s+/i,
    /^(?:前一个|上一个|新的|旧的|这个|那个)\s*/i
  ]);
  if (!stripped) return undefined;
  if (/^(?:项目|project|sdk|library|platform|api|repository|repo)$/i.test(stripped)) return undefined;
  return stripped;
}

export function normalizeLexiconText(text: string): string {
  return text
    .trim()
    .replace(/蓝芽/g, '蓝牙')
    .replace(/藍牙/g, '蓝牙')
    .replace(/耳機/g, '耳机')
    .replace(/断联/g, '断连')
    .replace(/斷連/g, '断连')
    .replace(/雜音/g, '杂音')
    .replace(/\bleft\s+disconnect\b/gi, 'left ear disconnect')
    .replace(/\bright\s+disconnect\b/gi, 'right ear disconnect')
    .replace(/\bleft ear\b/gi, '左耳')
    .replace(/\bright ear\b/gi, '右耳')
    .replace(/\s+/g, ' ')
    .trim();
}

export function includesLexiconTerm(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function normalizeShortReplyText(text: string): string {
  return normalizeLexiconText(text)
    .toLowerCase()
    .replace(/[，,]/g, ' ')
    .replace(/[。.!！？?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferEntityTypeFromText(text: string): CoreEntityType | undefined {
  const lowered = text.toLowerCase();
  const orderedTypes: CoreEntityType[] = ['device', 'project', 'brand', 'issue', 'person'];
  return orderedTypes.find((type) => includesLexiconTerm(lowered, ENTITY_TYPE_LEXICON[type]));
}

export function extractRelativeReferences(text: string): string[] {
  const lexiconRefs = [
    ...REFERENCE_SYNONYMS.latest,
    ...REFERENCE_SYNONYMS.previous,
    ...REFERENCE_SIGNAL_LEXICON.ambiguous_reference_signal
  ].filter((ref) => text.toLowerCase().includes(ref.toLowerCase()));
  const patternRefs = Array.from(
    normalizeLexiconText(text).matchAll(/((?:之前那个|前一个|上一个|新的那个|新的项目|新买的|新项目|旧的那个|旧的|那个|这个|它)(?:[\u4e00-\u9fa5A-Za-z0-9._ -]{0,6}(?:耳机|键盘|鼠标|显示器|项目|device|project)|(?:耳机|键盘|鼠标|显示器|项目|device|project))?)/gi)
  ).map((match) => match[1].trim());
  const englishPatternRefs = Array.from(
    normalizeLexiconText(text).matchAll(/((?:the new one|new one|this one|the current one|the previous one|previous one|the old one|old one|that one|this project|that project|the new project|new project|the previous project|previous project|old project|the previous headset|previous headset|the new headset|new headset|the previous monitor|previous monitor|the new monitor|new monitor|the previous keyboard|previous keyboard|the new keyboard|new keyboard|the previous mouse|previous mouse|the new mouse|new mouse)(?:\s+(?:bluetooth|wireless|current|new|old))?(?:\s+(?:headset|monitor|keyboard|mouse|device|project|earbuds))?)/gi)
  ).map((match) => match[1].trim());
  return Array.from(new Set([...lexiconRefs, ...patternRefs, ...englishPatternRefs]));
}

export function classifyIssueFamilies(text: string): IssueFamily[] {
  const lowered = text.toLowerCase();
  const families = (Object.entries(ISSUE_FAMILY_LEXICON) as Array<[IssueFamily, { keywords: readonly string[] }]>)
    .filter(([, descriptor]) => includesLexiconTerm(lowered, descriptor.keywords))
    .map(([family]) => family);
  return families.length > 0 ? families : [];
}

export function detectIssueQualifier(text: string): 'left' | 'right' | 'generic' {
  const lowered = text.toLowerCase();
  if (includesLexiconTerm(lowered, ISSUE_QUALIFIER_LEXICON.left)) return 'left';
  if (includesLexiconTerm(lowered, ISSUE_QUALIFIER_LEXICON.right)) return 'right';
  return 'generic';
}

export function inferIssueValue(text: string): string {
  const families = classifyIssueFamilies(text);
  if (families.includes('connectivity_issue')) return '断连';
  if (families.includes('sound_issue')) return '杂音';
  if (families.includes('performance_issue')) return '卡顿';
  return '问题';
}

export function hasIssueSignal(text: string): boolean {
  return classifyIssueFamilies(text).length > 0;
}

export function isStrongNewInstanceSignal(text: string): boolean {
  return includesLexiconTerm(normalizeLexiconText(text), ENTITY_INSTANCE_SIGNAL_LEXICON.strongNew);
}

export function isStrongUpdateInstanceSignal(text: string): boolean {
  return includesLexiconTerm(normalizeLexiconText(text), ENTITY_INSTANCE_SIGNAL_LEXICON.strongUpdate);
}

export function matchBindingReplyIntent(text: string): { kind: BindingReplyIntentKind; reference?: string } | null {
  const raw = normalizeLexiconText(text);
  if (/[？?]/.test(raw) || raw.length > 24) {
    return null;
  }

  const normalized = normalizeShortReplyText(text);
  const selectedReference = SHORT_REPLY_BINDING_LEXICON.entitySelection.find((term) => normalized.includes(term.toLowerCase()));
  if (selectedReference) {
    return { kind: 'entity_selection', reference: selectedReference };
  }

  const rejected = SHORT_REPLY_BINDING_LEXICON.rejected.find((term) => normalized.includes(term.toLowerCase()));
  if (rejected) {
    return { kind: 'rejected' };
  }

  const approved = SHORT_REPLY_BINDING_LEXICON.approved.find((term) => normalized === term.toLowerCase());
  if (approved) {
    return { kind: 'approved' };
  }

  return null;
}

export function isBindFirstShortReply(text: string): boolean {
  return matchBindingReplyIntent(text) !== null;
}

export function detectPendingBindingPromptType(text: string): 'action' | 'entity' | 'question' | null {
  const normalized = normalizeLexiconText(text);
  if (PENDING_BINDING_PROMPT_PATTERNS.action.some((pattern) => pattern.test(normalized))) return 'action';

  const hasRelativeReferences = extractRelativeReferences(normalized).length > 0;
  const hasEntityPromptPattern = PENDING_BINDING_PROMPT_PATTERNS.entity.some((pattern) => pattern.test(normalized));
  if (hasEntityPromptPattern && hasRelativeReferences) return 'entity';

  if (/\?$|？$/.test(normalized)) return 'question';
  return null;
}

export function hasLongTermMemorySignal(text: string): boolean {
  const normalized = normalizeLexiconText(text);
  return Boolean(
    inferEntityTypeFromText(normalized)
    || hasIssueSignal(normalized)
    || isOwnershipSignal(normalized)
    || isPurchaseSignal(normalized)
    || isWorkedOnSignal(normalized)
    || extractPreference(normalized)
    || includesLexiconTerm(normalized, LONG_TERM_MEMORY_SIGNAL_TERMS)
  );
}

export function extractIssueHints(text: string): string[] {
  const normalized = normalizeLexiconText(text);
  const segments = normalized
    .split(/[，。,.!?！？]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const hints = segments.filter((segment) => hasIssueSignal(segment));
  return hints.length > 0 ? hints : (hasIssueSignal(normalized) ? [normalized] : []);
}

export function extractLatestIssueReference(text: string): { reference: string; issue: string } | null {
  const normalized = normalizeLexiconText(text);
  const segments = normalized
    .split(/[，。,.!?！？]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => hasIssueSignal(segment));
  const target = segments[segments.length - 1];
  if (!target) return null;

  const qualifier = detectIssueQualifier(target);
  const explicitDevice = extractDeviceCandidate(target);
  const explicitProject = extractProjectCandidate(target);
  const reference = qualifier === 'left'
    ? '左耳'
    : qualifier === 'right'
      ? '右耳'
      : explicitDevice
        || explicitProject
        || extractRelativeReferences(target)[0]
        || 'device';

  return {
    reference,
    issue: inferIssueValue(target)
  };
}

export function extractIssueRankingTokensFromText(text: string): string[] {
  const normalized = normalizeLexiconText(text);
  const tokens: string[] = [];
  const qualifier = detectIssueQualifier(normalized);
  if (qualifier === 'left') tokens.push('left-ear');
  if (qualifier === 'right') tokens.push('right-ear');
  for (const family of classifyIssueFamilies(normalized)) {
    if (family === 'connectivity_issue') tokens.push('disconnect');
    if (family === 'sound_issue') tokens.push('noise');
    if (family === 'performance_issue') tokens.push('performance');
  }
  return Array.from(new Set(tokens));
}

export function extractDeviceCandidate(text: string): string | undefined {
  const normalized = normalizeLexiconText(text);
  const targetedPatterns = [
    /(?:i\s+own|i\s+have|i\s+got|i\s+bought(?:\s+(?:a|an|another))?(?:\s+new)?|my)\s+(?:an?\s+|the\s+)?([A-Za-z0-9._+-]+(?:\s+[A-Za-z0-9._+-]+){0,4}\s+(?:earphones?|earbuds?|headset|monitor|keyboard|mouse|device))\b/i,
    /(?:我(?:有|买了)|我的)\s*([\u4e00-\u9fa5A-Za-z0-9._+-]+(?:耳机|键盘|鼠标|显示器))/i,
    /\b([A-Za-z0-9._+-]+(?:\s+[A-Za-z0-9._+-]+){0,3}\s+(?:earphones?|earbuds?|headset|monitor|keyboard|mouse))\b/i
  ];
  for (const pattern of targetedPatterns) {
    const matched = normalized.match(pattern)?.[1];
    const candidate = matched ? cleanDeviceSurfaceCandidate(matched, normalized) : undefined;
    if (candidate) return candidate;
  }
  const matches = Array.from(normalized.matchAll(DEVICE_SURFACE_PATTERN));
  for (const match of matches) {
    const candidate = cleanDeviceSurfaceCandidate(match[1] || '', normalized);
    if (candidate) return candidate;
  }
  return undefined;
}

export function extractDeviceAliasCandidates(text: string): string[] {
  const normalized = normalizeLexiconText(text);
  const candidate = extractDeviceCandidate(normalized);
  if (!candidate) return [];

  const aliases = new Set<string>();
  const loweredCandidate = candidate.toLowerCase();
  const nounMatch = loweredCandidate.match(/\b(earphones?|earbuds?|headset|monitor|keyboard|mouse|device)\b/);
  if (nounMatch?.[1]) aliases.add(nounMatch[1].replace(/s$/i, ''));
  if (/\bbluetooth\b/i.test(candidate)) aliases.add('bluetooth');
  if (/\bwireless\b/i.test(candidate)) aliases.add('wireless');
  return Array.from(aliases);
}

export function isOwnershipSignal(text: string): boolean {
  return includesLexiconTerm(text, RELATION_PHRASE_MAP.owns);
}

export function extractOwnershipSignals(text: string): string[] {
  const normalized = normalizeLexiconText(text);
  const matches = normalized.match(/(我有一个[^，。,.!?]+|我有个[^，。,.!?]+|my\s+[^,.!?]+|i own (?:a|an)?\s*[^,.!?]+|i have (?:a|an)?\s*[^,.!?]+)/gi) || [];
  return Array.from(new Set(matches.map((match) => match.trim()).filter(Boolean)));
}

export function isPurchaseSignal(text: string): boolean {
  return includesLexiconTerm(text, RELATION_PHRASE_MAP.purchased);
}

export function isWorkedOnSignal(text: string): boolean {
  return includesLexiconTerm(text, RELATION_PHRASE_MAP.worked_on);
}

export function extractProjectCandidate(text: string): string | undefined {
  const normalized = normalizeLexiconText(text);
  const targetedPatterns = [
    /(?:we\s+are\s+building|we're\s+building|building|developing|working on|maintaining|shipping)\s+(?:an?\s+|the\s+)?([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,5}\s+(?:sdk|library|platform|api|project|repository|repo))\b/i,
    /(?:for|in|during|on)\s+(?:the\s+)?([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,3}\s+project)\b/i,
    /(?:worked on|working on|doing|building|maintaining|shipping)\s+([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,3}\s+project)\b/i,
    /([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,5}\s+(?:sdk|library|platform|api))\b/i,
    /([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,3}\s+project)\b/i,
    /([\u4e00-\u9fa5A-Za-z0-9._-]+项目)/i
  ];
  for (const pattern of targetedPatterns) {
    const matched = normalized.match(pattern)?.[1];
    const candidate = matched ? cleanProjectSurfaceCandidate(matched) : undefined;
    if (candidate) return candidate;
  }

  const matches = Array.from(normalized.matchAll(PROJECT_SURFACE_PATTERN));
  for (const match of matches) {
    const candidate = cleanProjectSurfaceCandidate(match[1] || '');
    if (candidate && !/(?:headset|monitor|keyboard|mouse|earbuds?|耳机|键盘|鼠标|显示器)/i.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function extractProjectLinks(text: string): string[] {
  const normalized = normalizeLexiconText(text);
  const matches = normalized.match(/[\u4e00-\u9fa5A-Za-z0-9._-]+项目|[A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,5}\s+(?:project|sdk|library|platform|api)/gi) || [];
  return Array.from(new Set(
    matches
      .map((match) => cleanProjectSurfaceCandidate(match))
      .filter((match): match is string => Boolean(match))
  ));
}

export function extractProjectAliasCandidates(text: string): string[] {
  const normalized = normalizeLexiconText(text);
  const aliases = new Set<string>();
  const projectCandidate = extractProjectCandidate(normalized);
  const patterns = [
    /([\u4e00-\u9fa5A-Za-z0-9._-]+项目|[A-Za-z0-9._-]+\s+project).{0,16}(?:也叫|又叫|别名是|alias|aka|also called|called)\s*([A-Za-z0-9._-]+(?:\s+project)?)/gi,
    /([A-Za-z0-9._-]+(?:\s+project)?).{0,16}(?:就是|is|means)\s*([\u4e00-\u9fa5A-Za-z0-9._-]+项目|[A-Za-z0-9._-]+\s+project)/gi
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      if (match[1]) aliases.add(match[1].trim());
      if (match[2]) aliases.add(match[2].trim());
    }
  }

  for (const link of extractProjectLinks(normalized)) {
    aliases.add(link);
    if (link.includes('-')) aliases.add(link.replace(/-/g, ' '));
    if (/\s+project$/i.test(link)) aliases.add(link.replace(/\s+project$/i, ''));
    if (/\s+sdk$/i.test(link) && /\bbluetooth\b/i.test(link)) aliases.add('bluetooth sdk');
  }

  if (projectCandidate && /\bsdk\b/i.test(projectCandidate)) {
    if (/\bbluetooth\b/i.test(projectCandidate)) aliases.add('bluetooth sdk');
    if (/\bbluetooth low energy\b/i.test(projectCandidate)) aliases.add('ble sdk');
    if (/\biot\b/i.test(normalized)) aliases.add('iot sdk');
  }

  for (const reference of extractRelativeReferences(normalized)) {
    if (/project|项目/i.test(reference)) aliases.add(reference);
  }

  return Array.from(aliases).filter(Boolean);
}

export function extractConditionHints(text: string): string[] {
  const normalized = normalizeLexiconText(text);
  const matches = normalized.match(/如果[^，。,.!?]+|if\s+[^,.!?]+/gi) || [];
  return Array.from(new Set(matches.map((match) => match.trim()).filter(Boolean)));
}

export function extractTemporalHints(text: string): CoreTemporalHint[] {
  const normalized = normalizeLexiconText(text);
  const hints: CoreTemporalHint[] = [];
  if (/(今天|today)/i.test(normalized)) hints.push('today');
  if (/(本周|this week)/i.test(normalized)) hints.push('this_week');
  if (/(这个月|this month)/i.test(normalized)) hints.push('this_month');
  if (/(近一年|past year|last year)/i.test(normalized)) hints.push('past_year');
  if (/(半年|half year|six months)/i.test(normalized)) hints.push('around_half_year_ago');
  return Array.from(new Set(hints));
}

export function extractPreference(text: string): { kind: 'like' | 'dislike'; target: string } | null {
  const matches = Array.from(
    text.matchAll(/(?<verb>喜欢|I like|讨厌|不喜欢|I dislike)\s*(?<target>[\u4e00-\u9fa5A-Za-z0-9._-]+(?:\s+[\u4e00-\u9fa5A-Za-z0-9._-]+){0,2})/gi)
  );
  const last = matches[matches.length - 1];
  if (!last?.groups?.verb || !last.groups.target) return null;
  return {
    kind: /^(讨厌|不喜欢|I dislike)$/i.test(last.groups.verb) ? 'dislike' : 'like',
    target: last.groups.target.trim().replace(/\s+/g, ' ')
  };
}

export function extractNegativePreferenceCue(text: string): { kind: 'dislike'; target: string } | null {
  const normalized = normalizeLexiconText(text);
  const negative = normalized.match(/(?:一闻到|一看到|看到|听到)?\s*([\u4e00-\u9fa5A-Za-z0-9._-]+(?:\s+[\u4e00-\u9fa5A-Za-z0-9._-]+){0,2})\s*(?:就烦|就讨厌|就难受|就不想碰)/i);
  if (!negative?.[1]) return null;
  return {
    kind: 'dislike',
    target: negative[1]
      .trim()
      .replace(/^(现在|如今|最近)\s*/i, '')
      .replace(/^(一闻到|一看到|看到|听到)\s*/i, '')
      .replace(/\s+/g, ' ')
  };
}

export function extractExplicitNamedEntityCandidate(text: string): string | null {
  const normalized = normalizeLexiconText(text);
  const explicitNamedDevice = normalized.match(
    /(?:i\s+bought(?:\s+(?:a|an|another))?(?:\s+new)?|i\s+have(?:\s+(?:a|an))?|i\s+had(?:\s+(?:a|an))?|i\s+got(?:\s+(?:a|an))?(?:\s+new)?|my|买了(?:一个|一副)?|我买了|我有一个|我有个|我的)\s+([A-Za-z][A-Za-z0-9._-]*(?:\s+[A-Za-z0-9._-]+){0,3})(?=\s+(?:for|in|during|on|yesterday|today|earlier|later|project|headset|monitor|keyboard|mouse|earbuds?)\b|[,.!?，。！？]|$)/i
  );
  const candidate = explicitNamedDevice?.[1]
    ?.trim()
    .replace(/\s+(?:yesterday|today|earlier|later)\.?$/i, '')
    .trim();
  if (!candidate) return null;
  if (/^(i like|i dislike)$/i.test(candidate)) return null;
  return collapseSurfaceWhitespace(candidate);
}

export function extractApprovedArchiveProject(text: string): string | null {
  const normalized = normalizeLexiconText(text);
  const archiveProject = normalized.match(/(?:([\u4e00-\u9fa5A-Za-z0-9._-]+项目|[A-Za-z0-9._-]+\s+project).*(归档|archive))|((归档|archive).{0,12}([\u4e00-\u9fa5A-Za-z0-9._-]+项目|[A-Za-z0-9._-]+\s+project))/i);
  return archiveProject?.[1] || archiveProject?.[5] || null;
}

export function inferReferenceType(reference: string, query: string): CoreEntityType | undefined {
  const candidate = `${reference} ${query}`.toLowerCase();
  if (includesLexiconTerm(candidate, ENTITY_TYPE_LEXICON.device)) return 'device';
  if (includesLexiconTerm(candidate, ENTITY_TYPE_LEXICON.project)) return 'project';
  return undefined;
}

export function isLatestReference(reference: string): boolean {
  const normalized = reference.toLowerCase();
  return REFERENCE_SYNONYMS.latest.some((item) => item.toLowerCase() === normalized)
    || /\b(the\s+)?new\s+(headset|monitor|keyboard|mouse|project)\b/i.test(reference);
}

export function isPreviousReference(reference: string): boolean {
  const normalized = reference.toLowerCase();
  return REFERENCE_SYNONYMS.previous.some((item) => item.toLowerCase() === normalized)
    || /\b(the\s+)?previous\s+(headset|monitor|keyboard|mouse|project)\b/i.test(reference);
}

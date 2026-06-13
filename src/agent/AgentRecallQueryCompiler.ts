export type AgentRecallIntent = 'memory_recall' | 'previous_session_summary' | 'forensic_quote';

export interface AgentRecallQueryCompileInput {
  query: string;
  intent?: AgentRecallIntent;
  anchorText?: string;
}

export interface AgentRecallQueryPlan {
  originalQuery: string;
  intent: AgentRecallIntent;
  primarySearchText: string;
  searchTexts: string[];
  keywords: string[];
  semanticCuePhrases: string[];
  temporalHints: string[];
  anchorUsed: boolean;
}

const PROTECTED_PHRASES = [
  'CogMem Memory Context',
  'Memory Context',
  'OpenClaw',
  'Hermes',
  'cogmem',
  'Obsidian',
  '记忆内核',
  '记忆黑盒',
  '黑盒',
  '记忆',
  '因果链',
  '原话',
  '上下文',
  '偏好',
  '项目',
  '约束',
  '边界',
];

const QUERY_FILLERS = [
  '我现在不是问你泛泛解释',
  '不是问你泛泛解释',
  '泛泛解释',
  '我不是要你',
  '我是问',
  '我想知道',
  '你还记不记得',
  '还记不记得',
  '你记得吗',
  '记得吗',
  '我们之前讨论过关于',
  '我们之前讨论过',
  '之前讨论过',
  '当时我问你的',
  '当时的',
  '这个问题时',
  '这个问题',
  '的问题',
  '问题',
  '是什么',
  '什么',
  'the',
  'a',
  'an',
  'please',
];

const QUOTE_TERMS = new Set(['原话', 'exact', 'quote', 'verbatim']);

export function compileAgentRecallQuery(input: AgentRecallQueryCompileInput): AgentRecallQueryPlan {
  const originalQuery = normalizeWhitespace(input.query);
  const intent = input.intent ?? inferAgentRecallIntent(originalQuery);
  const anchorText = normalizeWhitespace(input.anchorText || '');
  const queryKeywords = extractRecallKeywords(originalQuery);
  const anchorKeywords = extractRecallKeywords(anchorText);
  const keywordSource = anchorKeywords.length > 0 && isVagueForensicFollowup(originalQuery)
    ? anchorKeywords
    : mergeKeywords(queryKeywords, anchorKeywords);
  const keywords = intent === 'forensic_quote'
    ? keywordSource.filter((keyword) => !QUOTE_TERMS.has(keyword.toLowerCase()))
    : keywordSource;
  const residual = stripFillers(originalQuery);
  const anchorResidual = stripFillers(anchorText);
  const semanticCuePhrases = buildSemanticCuePhrases(keywords, originalQuery, anchorText);
  const temporalHints = extractTemporalHints(originalQuery);
  const searchTexts = uniqueNonEmpty([
    joinKeywords(keywords),
    joinKeywords(queryKeywords.filter((keyword) => !QUOTE_TERMS.has(keyword.toLowerCase()))),
    joinKeywords(anchorKeywords.filter((keyword) => !QUOTE_TERMS.has(keyword.toLowerCase()))),
    ...semanticCuePhrases,
    residual && keywords.length === 0 ? residual : '',
    anchorResidual && keywords.length === 0 ? anchorResidual : '',
  ]).filter((candidate) => !containsFiller(candidate));

  return {
    originalQuery,
    intent,
    primarySearchText: searchTexts[0] || residual || originalQuery,
    searchTexts: searchTexts.length > 0 ? searchTexts : [originalQuery],
    keywords,
    semanticCuePhrases,
    temporalHints,
    anchorUsed: anchorKeywords.length > 0,
  };
}

export function inferAgentRecallIntent(query: string): AgentRecallIntent {
  const text = query.toLowerCase();
  if (/(上一个|上个|上一|上次).{0,12}(会话|session)|previous session|last session/.test(text)) {
    return 'previous_session_summary';
  }
  if (/原话|怎么说的|完整对话|上一句|下一句|exact quote|verbatim/.test(text)) {
    return 'forensic_quote';
  }
  return 'memory_recall';
}

export function extractRecallKeywords(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  const found: string[] = [];
  const lower = normalized.toLowerCase();
  for (const phrase of PROTECTED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      if (phrase === '记忆黑盒') {
        found.push('记忆', '黑盒');
      } else if (phrase === '记忆内核') {
        found.push('记忆');
      } else if (phrase === 'cogmem' && lower.includes('cogmem memory context')) {
        continue;
      } else if (phrase === 'Memory Context' && lower.includes('cogmem memory context')) {
        continue;
      } else if (phrase !== '上下文' && phrase !== '问题') {
        found.push(phrase);
      }
    }
  }

  for (const token of normalized.split(/[^\p{L}\p{N}_-]+/u)) {
    const cleaned = token.trim();
    if (!cleaned || cleaned.length < 3) continue;
    if (/^[\u4e00-\u9fff]+$/u.test(cleaned)) continue;
    if (lower.includes('cogmem memory context') && /^(cogmem|memory|context)$/i.test(cleaned)) continue;
    if (QUERY_FILLERS.some((filler) => filler.toLowerCase() === cleaned.toLowerCase())) continue;
    found.push(cleaned);
  }
  return mergeKeywords(found);
}

function isVagueForensicFollowup(query: string): boolean {
  const withoutFillers = stripFillers(query);
  const keywords = extractRecallKeywords(withoutFillers).filter((keyword) => !QUOTE_TERMS.has(keyword.toLowerCase()));
  return /原话|exact quote|verbatim/.test(query.toLowerCase()) && keywords.length === 0;
}

function stripFillers(value: string): string {
  let output = normalizeWhitespace(value);
  for (const filler of QUERY_FILLERS) {
    output = output.replace(new RegExp(escapeRegExp(filler), 'giu'), ' ');
  }
  return normalizeWhitespace(output.replace(/[，。？！、；：,.?!;:]/g, ' '));
}

function containsFiller(value: string): boolean {
  return QUERY_FILLERS.some((filler) => value.toLowerCase().includes(filler.toLowerCase()));
}

function joinKeywords(keywords: string[]): string {
  return mergeKeywords(keywords).join(' ');
}

function buildSemanticCuePhrases(keywords: string[], query: string, anchorText: string): string[] {
  const merged = mergeKeywords(keywords);
  const text = `${query}\n${anchorText}`;
  const out: string[] = [];
  const hasMemory = merged.includes('记忆') || /memory|CogMem|记忆/u.test(text);
  const hasBlackBox = merged.includes('黑盒') || /黑盒|black\s*box/iu.test(text);

  if (hasMemory && hasBlackBox) {
    out.push('记忆 黑盒');
    out.push('存档 黑盒');
    out.push('对话 存档 黑盒');
    out.push('上下文 黑盒');
    out.push('黑盒');
  } else if (hasBlackBox) {
    out.push('黑盒');
    out.push('存档 黑盒');
  }

  if (/原话|exact quote|verbatim/iu.test(text) && hasBlackBox) {
    out.push('黑盒 原话');
  }
  if (/CogMem Memory Context/iu.test(text)) {
    out.push('CogMem Memory Context');
    out.push('Memory Context');
  }

  return uniqueNonEmpty(out);
}

function extractTemporalHints(query: string): string[] {
  const hints: string[] = [];
  if (/之前|以前|过去|几个月前|半年前|上个月|前几天|昨天|上次|上个|previous|before|last/i.test(query)) {
    hints.push('past');
  }
  if (/昨天|yesterday/i.test(query)) hints.push('yesterday');
  if (/上一个|上个|上次|previous|last/i.test(query)) hints.push('previous');
  return uniqueNonEmpty(hints);
}

function mergeKeywords(...groups: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const keyword of groups.flat()) {
    const normalized = normalizeWhitespace(keyword);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    if (normalized === '记忆内核' && seen.has('记忆')) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function uniqueNonEmpty(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values.map(normalizeWhitespace)) {
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    out.push(value);
  }
  return out;
}

function normalizeWhitespace(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

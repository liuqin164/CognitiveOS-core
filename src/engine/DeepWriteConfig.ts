export type DeepWriteMode = 'off' | 'shadow' | 'candidate' | 'promote_guarded';

export interface DeepWriteConfig {
  enabled: boolean;
  mode: DeepWriteMode;
  contextTurns: number;
  recallLimit: number;
  minPromoteConfidence: number;
  modelRole: 'memory';
  allowCloud: boolean;
  redactionEnabled: boolean;
  promoteCausalLinks: boolean;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseMode(value: string | undefined): DeepWriteMode {
  const normalized = (value || 'off').trim();
  return normalized === 'shadow'
    || normalized === 'candidate'
    || normalized === 'promote_guarded'
    || normalized === 'off'
    ? normalized
    : 'off';
}

export function resolveDeepWriteConfig(env: NodeJS.ProcessEnv = process.env): DeepWriteConfig {
  const enabled = parseBoolean(env.AGENT_BRAIN_DEEP_WRITE_ENABLED, false);
  const mode = enabled ? parseMode(env.AGENT_BRAIN_DEEP_WRITE_MODE || 'shadow') : 'off';

  return {
    enabled,
    mode,
    contextTurns: Math.min(100, Math.floor(parseNumber(env.AGENT_BRAIN_DEEP_WRITE_CONTEXT_TURNS, 24))),
    recallLimit: Math.min(50, Math.floor(parseNumber(env.AGENT_BRAIN_DEEP_WRITE_RECALL_LIMIT, 12))),
    minPromoteConfidence: Math.min(1, Math.max(0, parseNumber(env.AGENT_BRAIN_DEEP_WRITE_MIN_PROMOTE_CONFIDENCE, 0.86))),
    modelRole: 'memory',
    allowCloud: parseBoolean(env.AGENT_BRAIN_DEEP_WRITE_ALLOW_CLOUD, false),
    redactionEnabled: parseBoolean(env.AGENT_BRAIN_DEEP_WRITE_REDACTION_ENABLED, true),
    promoteCausalLinks: parseBoolean(env.AGENT_BRAIN_DEEP_WRITE_PROMOTE_CAUSAL, false)
  };
}

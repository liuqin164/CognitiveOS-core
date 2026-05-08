#!/usr/bin/env bun
/**
 * cogmem-init — Interactive configuration wizard for @CognitiveOS/core
 *
 * Guides new users through:
 *  1. Database path
 *  2. Vector backend (sqlite-vec vs hnswlib)
 *  3. Embedding provider (auto-detected from Ollama / env keys)
 *  4. Memory & reasoning model roles
 *  5. PII redaction policy
 *  6. AES-256-GCM encryption passphrase (optional)
 *  7. OpenClaw workspace integration (auto-detected)
 *
 * Writes a `.cogmem/config.toml` file loadable by `createMemoryKernelFromConfig()`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import { dirname, resolve, join } from 'node:path';
import { defaultCogmemHome } from '../config/CogmemConfig.js';
function readArgs(argv) {
    const readValue = (name, fallback) => {
        const index = argv.indexOf(name);
        if (index === -1)
            return fallback;
        return argv[index + 1] || fallback;
    };
    const agent = readValue('--agent', 'auto');
    const scope = readValue('--scope', 'global');
    return {
        envPath: readValue('--env-path', '.agent-brain.env'),
        configPath: readValue('--config', ''),
        homePath: readValue('--home', ''),
        scope: scope === 'project' ? 'project' : 'global',
        dryRun: argv.includes('--dry-run'),
        yes: argv.includes('--yes') || argv.includes('-y'),
        legacyEnv: argv.includes('--legacy-env') || argv.includes('--env-path'),
        agent: agent === 'openclaw' || agent === 'hermes' || agent === 'none' ? agent : 'auto',
    };
}
// ─── Readline helpers ─────────────────────────────────────────────────────────
function ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((res) => {
        rl.question(question, (answer) => {
            rl.close();
            res(answer.trim());
        });
    });
}
async function confirm(question, defaultYes = false) {
    const hint = defaultYes ? '(Y/n)' : '(y/N)';
    const raw = await ask(`${question} ${hint} `);
    if (raw === '')
        return defaultYes;
    return raw.toLowerCase() === 'y';
}
// ─── Backend detection ────────────────────────────────────────────────────────
async function detectBackends() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    let ollamaAvailable = false;
    let ollamaModels = [];
    try {
        const res = await fetch('http://localhost:11434/api/tags', {
            signal: controller.signal,
        });
        if (res.ok) {
            const payload = await res.json();
            ollamaModels = (payload.models ?? [])
                .map((m) => m.name ?? '')
                .filter((n) => n.length > 0);
            ollamaAvailable = true;
        }
    }
    catch {
        // Ollama not running — fine
    }
    finally {
        clearTimeout(timer);
    }
    return {
        ollamaAvailable,
        ollamaModels,
        openaiAvailable: Boolean(process.env.OPENAI_API_KEY),
        anthropicAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
        qwenAvailable: Boolean(process.env.QWEN_API_KEY),
    };
}
// ─── OpenClaw workspace detection ────────────────────────────────────────────
function detectOpenClaw(cwd) {
    const hasMemoryDir = existsSync(join(cwd, 'memory'));
    const hasUserMd = existsSync(join(cwd, 'USER.md'));
    const hasSoulMd = existsSync(join(cwd, 'SOUL.md'));
    const hasPersonaMd = existsSync(join(cwd, 'PERSONA.md'));
    const detected = hasMemoryDir || (hasUserMd && hasSoulMd);
    return { detected, hasMemoryDir, hasUserMd, hasSoulMd, hasPersonaMd };
}
// ─── Model suggestion helpers ─────────────────────────────────────────────────
function pickFirst(models, ...matchers) {
    for (const matcher of matchers) {
        const found = models.find((m) => matcher(m.toLowerCase()));
        if (found)
            return found;
    }
    return undefined;
}
function suggestEmbeddingModel(det) {
    if (det.ollamaAvailable) {
        const model = pickFirst(det.ollamaModels, (n) => n.includes('bge-m3'), (n) => n.includes('nomic-embed-text'), (n) => n.startsWith('dmeta'), (n) => n.startsWith('mxbai'));
        if (model) {
            return { provider: 'openai_compatible', model, baseUrl: 'http://localhost:11434/v1' };
        }
    }
    return { provider: 'deterministic_local', model: 'deterministic_local', baseUrl: '' };
}
function suggestMemoryModel(det) {
    if (det.ollamaAvailable && det.ollamaModels.length > 0) {
        const model = pickFirst(det.ollamaModels, (n) => n.includes('qwen2.5'), (n) => n.includes('qwen'), (n) => n.includes('gemma'), () => true) ?? det.ollamaModels[0];
        return { provider: 'openai_compatible', model, baseUrl: 'http://localhost:11434/v1', apiKey: '' };
    }
    if (det.openaiAvailable) {
        return { provider: 'openai_compatible', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', apiKey: '${OPENAI_API_KEY}' };
    }
    if (det.anthropicAvailable) {
        return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', baseUrl: '', apiKey: '${ANTHROPIC_API_KEY}' };
    }
    return { provider: 'rule_only', model: 'rule_only', baseUrl: '', apiKey: '' };
}
function suggestReasoningModel(det) {
    if (det.anthropicAvailable) {
        return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', baseUrl: '', apiKey: '${ANTHROPIC_API_KEY}' };
    }
    if (det.openaiAvailable) {
        return { provider: 'openai_compatible', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', apiKey: '${OPENAI_API_KEY}' };
    }
    if (det.ollamaAvailable && det.ollamaModels.length > 0) {
        // Prefer a 7B+ model for reasoning
        const sevenBPlus = det.ollamaModels.find((n) => /\b(7b|8b|9b|11b|12b|13b|14b|20b|27b|32b|70b)\b/i.test(n) ||
            /:(7|8|9|11|12|13|14|20|27|32|34|70)b\b/i.test(n));
        const model = sevenBPlus ?? det.ollamaModels[0];
        return { provider: 'openai_compatible', model, baseUrl: 'http://localhost:11434/v1', apiKey: '' };
    }
    return { provider: 'rule_only', model: 'rule_only', baseUrl: '', apiKey: '' };
}
// ─── Display helpers ──────────────────────────────────────────────────────────
function tick(ok) { return ok ? '✓' : '✗'; }
function printDetection(det) {
    console.log('');
    console.log('  Detection results:');
    if (det.ollamaAvailable) {
        console.log(`    Ollama    ${tick(true)} running — ${det.ollamaModels.length} model(s): ${det.ollamaModels.slice(0, 4).join(', ')}${det.ollamaModels.length > 4 ? ' …' : ''}`);
    }
    else {
        console.log(`    Ollama    ${tick(false)} not running (install: https://ollama.com)`);
    }
    console.log(`    OpenAI    ${tick(det.openaiAvailable)} ${det.openaiAvailable ? 'OPENAI_API_KEY set' : 'not set'}`);
    console.log(`    Anthropic ${tick(det.anthropicAvailable)} ${det.anthropicAvailable ? 'ANTHROPIC_API_KEY set' : 'not set'}`);
    console.log(`    Qwen      ${tick(det.qwenAvailable)} ${det.qwenAvailable ? 'QWEN_API_KEY set' : 'not set'}`);
}
function noBackendQuickstart() {
    console.log('');
    console.log('  No model backend detected. The kernel will run in rule_only mode');
    console.log('  (no model downloads needed — works out of the box, reduced quality).');
    console.log('');
    console.log('  To unlock richer memory consolidation, set up a backend first:');
    console.log('');
    console.log('    Option A — Local (Ollama, free, private):');
    console.log('      brew install ollama          # macOS');
    console.log('      ollama pull nomic-embed-text # semantic embeddings');
    console.log('      ollama pull qwen2.5:3b       # memory consolidation');
    console.log('      ollama pull qwen2.5:7b       # agent reasoning');
    console.log('      cogmem-init                  # re-run this wizard');
    console.log('');
    console.log('    Option B — Cloud reasoning only:');
    console.log('      export ANTHROPIC_API_KEY=sk-ant-...');
    console.log('      export OPENAI_API_KEY=sk-...      # or OpenAI');
    console.log('      cogmem-init');
    console.log('');
}
// ─── Wizard sections ──────────────────────────────────────────────────────────
async function stepDatabase() {
    console.log('');
    console.log('  ── Step 1 of 6: Database ─────────────────────────────────────');
    console.log('  The kernel persists all memory to a single SQLite file.');
    console.log('  Relative paths are resolved from the cogmem config directory.');
    console.log('');
    const raw = await ask('  DB path [memory.db]: ');
    return raw || 'memory.db';
}
async function stepVectorBackend() {
    console.log('');
    console.log('  ── Step 2 of 6: Vector Backend ───────────────────────────────');
    console.log('  sqlite-vec  Pure SQLite cosine search. Zero native deps. (recommended)');
    console.log('  hnswlib     HNSW graph. Faster at scale but requires a native addon.');
    console.log('');
    const raw = await ask('  Backend [sqlite-vec]: ');
    const choice = raw.toLowerCase();
    if (choice === 'hnswlib')
        return 'hnswlib';
    return 'sqlite-vec';
}
async function stepEmbedding(det) {
    console.log('');
    console.log('  ── Step 3 of 6: Embedding ────────────────────────────────────');
    const suggestion = suggestEmbeddingModel(det);
    if (suggestion.provider === 'openai_compatible') {
        console.log(`  Auto-detected: ${suggestion.model} via Ollama`);
    }
    else {
        console.log('  No embedding model detected — using deterministic_local (BM25-style, no download).');
        console.log('  For real semantic recall: ollama pull nomic-embed-text OR bge-m3');
    }
    console.log('');
    const edit = await confirm('  Edit embedding settings?', false);
    if (!edit)
        return suggestion;
    const providerRaw = await ask(`  Provider [${suggestion.provider}]: `);
    const provider = (providerRaw || suggestion.provider);
    if (provider === 'openai_compatible') {
        const baseUrl = await ask(`  Base URL [${suggestion.baseUrl || 'http://localhost:11434/v1'}]: `);
        const model = await ask(`  Model name [${suggestion.model}]: `);
        return {
            provider: 'openai_compatible',
            baseUrl: baseUrl || suggestion.baseUrl || 'http://localhost:11434/v1',
            model: model || suggestion.model,
        };
    }
    return { provider: 'deterministic_local', model: 'deterministic_local', baseUrl: '' };
}
async function stepModelRoles(det) {
    console.log('');
    console.log('  ── Step 4 of 6: Model Roles ──────────────────────────────────');
    console.log('  memory    — extracts and consolidates long-term knowledge');
    console.log('  reasoning — answers questions and drives tool-use');
    console.log('  (Both can be rule_only if no LLM backend is configured.)');
    console.log('');
    const memSug = suggestMemoryModel(det);
    const reasSug = suggestReasoningModel(det);
    console.log(`  Suggested memory    → ${memSug.provider} / ${memSug.model}${memSug.baseUrl ? ` @ ${memSug.baseUrl.replace(/^https?:\/\//, '').replace(/\/v1$/, '')}` : ''}`);
    console.log(`  Suggested reasoning → ${reasSug.provider} / ${reasSug.model}${reasSug.baseUrl ? ` @ ${reasSug.baseUrl.replace(/^https?:\/\//, '').replace(/\/v1$/, '')}` : ''}`);
    console.log('');
    const edit = await confirm('  Edit model role settings?', false);
    if (!edit) {
        return {
            memoryProvider: memSug.provider,
            memoryBaseUrl: memSug.baseUrl,
            memoryApiKey: memSug.apiKey,
            memoryModel: memSug.model,
            reasoningProvider: reasSug.provider,
            reasoningBaseUrl: reasSug.baseUrl,
            reasoningApiKey: reasSug.apiKey,
            reasoningModel: reasSug.model,
        };
    }
    // Memory role
    console.log('');
    console.log('  [memory role]');
    const mProvRaw = await ask(`  Provider (openai_compatible | anthropic | rule_only) [${memSug.provider}]: `);
    const mProv = (mProvRaw || memSug.provider);
    const mModel = await ask(`  Model name [${memSug.model}]: `);
    let mBaseUrl = memSug.baseUrl;
    let mApiKey = memSug.apiKey;
    if (mProv === 'openai_compatible') {
        const bu = await ask(`  Base URL [${memSug.baseUrl || 'http://localhost:11434/v1'}]: `);
        mBaseUrl = bu || memSug.baseUrl || 'http://localhost:11434/v1';
        const ak = await ask(`  API key or env-var placeholder [${memSug.apiKey}]: `);
        mApiKey = ak || memSug.apiKey;
    }
    else if (mProv === 'anthropic') {
        const ak = await ask(`  API key env-var [${memSug.apiKey || '${ANTHROPIC_API_KEY}'}]: `);
        mApiKey = ak || memSug.apiKey || '${ANTHROPIC_API_KEY}';
        mBaseUrl = '';
    }
    else {
        mBaseUrl = '';
        mApiKey = '';
    }
    // Reasoning role
    console.log('');
    console.log('  [reasoning role]');
    const rProvRaw = await ask(`  Provider (openai_compatible | anthropic | rule_only) [${reasSug.provider}]: `);
    const rProv = (rProvRaw || reasSug.provider);
    const rModel = await ask(`  Model name [${reasSug.model}]: `);
    let rBaseUrl = reasSug.baseUrl;
    let rApiKey = reasSug.apiKey;
    if (rProv === 'openai_compatible') {
        const bu = await ask(`  Base URL [${reasSug.baseUrl || 'http://localhost:11434/v1'}]: `);
        rBaseUrl = bu || reasSug.baseUrl || 'http://localhost:11434/v1';
        const ak = await ask(`  API key or env-var placeholder [${reasSug.apiKey}]: `);
        rApiKey = ak || reasSug.apiKey;
    }
    else if (rProv === 'anthropic') {
        const ak = await ask(`  API key env-var [${reasSug.apiKey || '${ANTHROPIC_API_KEY}'}]: `);
        rApiKey = ak || reasSug.apiKey || '${ANTHROPIC_API_KEY}';
        rBaseUrl = '';
    }
    else {
        rBaseUrl = '';
        rApiKey = '';
    }
    return {
        memoryProvider: mProv,
        memoryBaseUrl: mBaseUrl,
        memoryApiKey: mApiKey,
        memoryModel: mModel || memSug.model,
        reasoningProvider: rProv,
        reasoningBaseUrl: rBaseUrl,
        reasoningApiKey: rApiKey,
        reasoningModel: rModel || reasSug.model,
    };
}
async function stepGovernance() {
    console.log('');
    console.log('  ── Step 5 of 6: Governance ───────────────────────────────────');
    console.log('  PII redaction strips sensitive patterns before writing to the DB.');
    console.log('  AES-256-GCM field encryption protects content at rest.');
    console.log('');
    const piiAll = await confirm('  Enable PII auto-redaction (email / phone / SSN)?', true);
    let piiEmail = piiAll;
    let piiPhone = piiAll;
    let piiSsn = piiAll;
    if (piiAll) {
        const fine = await confirm('  Fine-tune individual PII categories?', false);
        if (fine) {
            piiEmail = await confirm('    Redact email addresses?', true);
            piiPhone = await confirm('    Redact phone numbers?', true);
            piiSsn = await confirm('    Redact SSNs (XXX-XX-XXXX)?', true);
        }
    }
    console.log('');
    const useEncryption = await confirm('  Enable AES-256-GCM field encryption at rest?', false);
    let encryptionPassphrase = '';
    if (useEncryption) {
        console.log('  ⚠  The passphrase cannot be recovered. Store it safely.');
        encryptionPassphrase = await ask('  Passphrase: ');
        if (!encryptionPassphrase) {
            console.log('  Empty passphrase entered — encryption disabled.');
        }
    }
    return { piiEmail, piiPhone, piiSsn, encryptionPassphrase };
}
async function stepOpenClaw(oclaw) {
    console.log('');
    console.log('  ── Step 6 of 6: OpenClaw Integration ─────────────────────────');
    if (!oclaw.detected) {
        console.log('  No OpenClaw workspace detected in current directory.');
        console.log('  (Expects: memory/ folder and/or USER.md + SOUL.md)');
        return false;
    }
    console.log('  OpenClaw workspace detected:');
    if (oclaw.hasMemoryDir)
        console.log('    memory/     ✓');
    if (oclaw.hasUserMd)
        console.log('    USER.md     ✓');
    if (oclaw.hasSoulMd)
        console.log('    SOUL.md     ✓');
    if (oclaw.hasPersonaMd)
        console.log('    PERSONA.md  ✓');
    console.log('');
    console.log('  Enabling will configure the 5 OpenClaw batch source adapters:');
    console.log('    daily_memory · session · memory_index · user_profile · persona');
    console.log('');
    return confirm('  Enable OpenClaw batch source integration?', true);
}
// ─── Config file writer ───────────────────────────────────────────────────────
function buildEnvLines(cfg) {
    const lines = [];
    const kv = (key, value) => {
        if (value !== '' && value !== undefined) {
            lines.push(`${key}=${value}`);
        }
    };
    lines.push('# Generated by cogmem-init');
    lines.push(`# $(date): ${new Date().toISOString()}`);
    lines.push('');
    lines.push('# ── Core ─────────────────────────────────────────────────────');
    kv('COGMEM_DB', cfg.dbPath);
    kv('COGMEM_VECTOR_BACKEND', cfg.vectorBackend);
    lines.push('');
    lines.push('# ── Embedding ────────────────────────────────────────────────');
    kv('AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER', cfg.embeddingProvider);
    if (cfg.embeddingProvider === 'openai_compatible') {
        kv('AGENT_BRAIN_MODEL_EMBEDDING_BASE_URL', cfg.embeddingBaseUrl);
        kv('AGENT_BRAIN_MODEL_EMBEDDING_NAME', cfg.embeddingModel);
    }
    else {
        kv('AGENT_BRAIN_MODEL_EMBEDDING_NAME', 'deterministic_local');
    }
    kv('AGENT_BRAIN_MODEL_EMBEDDING_TIMEOUT_MS', '30000');
    lines.push('');
    lines.push('# ── Memory model ─────────────────────────────────────────────');
    kv('AGENT_BRAIN_MODEL_MEMORY_PROVIDER', cfg.memoryProvider);
    if (cfg.memoryBaseUrl)
        kv('AGENT_BRAIN_MODEL_MEMORY_BASE_URL', cfg.memoryBaseUrl);
    if (cfg.memoryApiKey)
        kv('AGENT_BRAIN_MODEL_MEMORY_API_KEY', cfg.memoryApiKey);
    kv('AGENT_BRAIN_MODEL_MEMORY_NAME', cfg.memoryModel);
    kv('AGENT_BRAIN_MODEL_MEMORY_TIMEOUT_MS', '60000');
    kv('AGENT_BRAIN_MODEL_MEMORY_FALLBACK', 'rule_only');
    lines.push('');
    lines.push('# ── Reasoning model ──────────────────────────────────────────');
    kv('AGENT_BRAIN_MODEL_REASONING_PROVIDER', cfg.reasoningProvider);
    if (cfg.reasoningBaseUrl)
        kv('AGENT_BRAIN_MODEL_REASONING_BASE_URL', cfg.reasoningBaseUrl);
    if (cfg.reasoningApiKey)
        kv('AGENT_BRAIN_MODEL_REASONING_API_KEY', cfg.reasoningApiKey);
    kv('AGENT_BRAIN_MODEL_REASONING_NAME', cfg.reasoningModel);
    kv('AGENT_BRAIN_MODEL_REASONING_TIMEOUT_MS', '60000');
    kv('AGENT_BRAIN_MODEL_REASONING_FALLBACK', 'memory');
    lines.push('');
    lines.push('# ── PII Redaction ────────────────────────────────────────────');
    kv('COGMEM_PII_REDACT_EMAIL', String(cfg.piiEmail));
    kv('COGMEM_PII_REDACT_PHONE', String(cfg.piiPhone));
    kv('COGMEM_PII_REDACT_SSN', String(cfg.piiSsn));
    lines.push('');
    if (cfg.encryptionPassphrase) {
        lines.push('# ── Encryption ───────────────────────────────────────────────');
        kv('COGMEM_ENCRYPTION_PASSPHRASE', cfg.encryptionPassphrase);
        lines.push('');
    }
    if (cfg.openClawEnabled) {
        lines.push('# ── OpenClaw ─────────────────────────────────────────────────');
        kv('COGMEM_OPENCLAW_ENABLED', 'true');
        kv('COGMEM_OPENCLAW_WORKSPACE_DIR', '.');
        lines.push('');
    }
    if (cfg.hermesEnabled) {
        lines.push('# ── Hermes ───────────────────────────────────────────────────');
        kv('COGMEM_HERMES_ENABLED', 'true');
        kv('COGMEM_HERMES_WORKSPACE_DIR', '.');
        lines.push('');
    }
    return lines;
}
function buildTomlLines(cfg) {
    const lines = [];
    lines.push('# Generated by cogmem-init');
    lines.push(`# date = ${tomlString(new Date().toISOString())}`);
    lines.push('');
    lines.push('[core]');
    lines.push(`db_path = ${tomlString(cfg.dbPath)}`);
    lines.push(`vector_backend = ${tomlString(cfg.vectorBackend)}`);
    lines.push('');
    lines.push('[paths]');
    lines.push('embeddings_dir = "embeddings"');
    lines.push('snapshots_dir = "snapshots"');
    lines.push('logs_dir = "logs"');
    lines.push('');
    lines.push('[embedding]');
    lines.push(`provider = ${tomlString(cfg.embeddingProvider)}`);
    if (cfg.embeddingBaseUrl)
        lines.push(`base_url = ${tomlString(cfg.embeddingBaseUrl)}`);
    lines.push(`model = ${tomlString(cfg.embeddingModel)}`);
    lines.push('timeout_ms = 30000');
    lines.push('');
    lines.push('[memory_model]');
    lines.push(`provider = ${tomlString(cfg.memoryProvider)}`);
    if (cfg.memoryBaseUrl)
        lines.push(`base_url = ${tomlString(cfg.memoryBaseUrl)}`);
    lines.push(`model = ${tomlString(cfg.memoryModel)}`);
    if (cfg.memoryApiKey)
        lines.push(`api_key = ${tomlString(cfg.memoryApiKey)}`);
    lines.push('timeout_ms = 60000');
    lines.push('');
    lines.push('[reasoning_model]');
    lines.push(`provider = ${tomlString(cfg.reasoningProvider)}`);
    if (cfg.reasoningBaseUrl)
        lines.push(`base_url = ${tomlString(cfg.reasoningBaseUrl)}`);
    lines.push(`model = ${tomlString(cfg.reasoningModel)}`);
    if (cfg.reasoningApiKey)
        lines.push(`api_key = ${tomlString(cfg.reasoningApiKey)}`);
    lines.push('timeout_ms = 60000');
    lines.push('');
    lines.push('[governance]');
    lines.push(`pii_redact_email = ${cfg.piiEmail}`);
    lines.push(`pii_redact_phone = ${cfg.piiPhone}`);
    lines.push(`pii_redact_ssn = ${cfg.piiSsn}`);
    lines.push(`encryption = ${Boolean(cfg.encryptionPassphrase)}`);
    if (cfg.encryptionPassphrase) {
        lines.push(`encryption_passphrase = ${tomlString(cfg.encryptionPassphrase)}`);
    }
    lines.push('');
    lines.push('[integrations.openclaw]');
    lines.push(`enabled = ${cfg.openClawEnabled}`);
    lines.push('workspace_dir = "."');
    lines.push('');
    lines.push('[integrations.hermes]');
    lines.push(`enabled = ${cfg.hermesEnabled}`);
    lines.push('workspace_dir = "."');
    lines.push('');
    return lines;
}
function tomlString(value) {
    return JSON.stringify(value);
}
function resolveInstallTarget(args) {
    const envPath = resolveInputPath(args.envPath);
    if (args.legacyEnv) {
        return { homeDir: process.cwd(), configPath: '', envPath };
    }
    const explicitConfigPath = args.configPath ? resolveInputPath(args.configPath) : '';
    const homeDir = args.homePath
        ? resolveInputPath(args.homePath)
        : explicitConfigPath
            ? dirname(explicitConfigPath)
            : args.scope === 'project'
                ? resolve(process.cwd(), '.cogmem')
                : defaultCogmemHome();
    return {
        homeDir,
        configPath: explicitConfigPath || join(homeDir, 'config.toml'),
        envPath,
    };
}
function resolveInputPath(value) {
    return resolve(process.cwd(), expandUserPath(value));
}
function expandUserPath(value) {
    const home = process.env.HOME || homedir();
    if (value === '~')
        return home;
    if (value.startsWith('~/'))
        return join(home, value.slice(2));
    return value;
}
function ensureInstallDirs(homeDir) {
    mkdirSync(homeDir, { recursive: true });
    mkdirSync(join(homeDir, 'embeddings'), { recursive: true });
    mkdirSync(join(homeDir, 'snapshots'), { recursive: true });
    mkdirSync(join(homeDir, 'logs'), { recursive: true });
}
// ─── Post-write code snippet ──────────────────────────────────────────────────
function printUsageSnippet(cfg, legacyEnv) {
    console.log('');
    console.log('  Quick-start snippet:');
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log(`  │  import { ${legacyEnv ? 'createMemoryKernelFromEnv' : 'createMemoryKernelFromConfig'} } from '@CognitiveOS/core';`);
    console.log('  │');
    if (legacyEnv) {
        console.log("  │  // Loads .agent-brain.env automatically");
        console.log('  │  const kernel = createMemoryKernelFromEnv();');
    }
    else {
        console.log("  │  // Auto-discovers .cogmem/config.toml or ~/.cogmem/config.toml");
        console.log('  │  const kernel = createMemoryKernelFromConfig();');
    }
    console.log('  │');
    console.log("  │  await kernel.ingest({ content: 'Remember that the user prefers concise answers.', projectId: 'my-agent' });");
    console.log("  │  const result = kernel.recall('what does the user prefer?', { projectId: 'my-agent' });");
    console.log('  │  console.log(result.rawEvidence.map((item) => item.content));');
    if (cfg.encryptionPassphrase) {
        console.log('  │');
        console.log(legacyEnv
            ? "  │  // For encryption, pass an AesGcmEncryptionProvider when creating the kernel."
            : "  │  // AES-256-GCM is created from config by createMemoryKernelFromConfig().");
    }
    console.log('  └─────────────────────────────────────────────────────────────┘');
    if (cfg.encryptionPassphrase) {
        console.log('');
        console.log('  Encryption note:');
        if (legacyEnv) {
            console.log("  │  import { AesGcmEncryptionProvider } from '@CognitiveOS/core';");
            console.log("  │  const enc = AesGcmEncryptionProvider.fromPassphrase(process.env.COGMEM_ENCRYPTION_PASSPHRASE!);");
            console.log('  │  const kernel = createMemoryKernelFromEnv({ dbPath, encryptionProvider: enc });');
        }
        else {
            console.log('  │  createMemoryKernelFromConfig() will create the AES-256-GCM provider from config.');
        }
    }
    if (cfg.openClawEnabled) {
        console.log('');
        console.log('  OpenClaw integration:');
        console.log("  │  import { OpenClawUserProfileAdapter, OpenClawPersonaAdapter } from '@CognitiveOS/core';");
        console.log('  │  // Use kernel.batchIngest() with the OpenClaw adapters');
        console.log('  │  // See packages/core/src/adapters/openclaw/ for all 5 adapter classes');
    }
    if (cfg.hermesEnabled) {
        console.log('');
        console.log('  Hermes integration:');
        console.log("  │  import { HermesWorkspaceProfile } from '@CognitiveOS/core';");
        console.log('  │  const profile = new HermesWorkspaceProfile(process.cwd());');
        console.log('  │  const sources = profile.buildSourceDefinitions({ projectId: "hermes" });');
    }
}
// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const args = readArgs(process.argv.slice(2));
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           @CognitiveOS/core — Memory Kernel Init             ║');
    console.log('║                   Interactive Setup Wizard                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    const target = resolveInstallTarget(args);
    console.log(args.legacyEnv
        ? '  This wizard writes .agent-brain.env in the current directory.'
        : '  This wizard writes ~/.cogmem/config.toml by default.');
    console.log('  Run cogmem-init again at any time to reconfigure.');
    if (!args.legacyEnv) {
        console.log(`  Cogmem home: ${target.homeDir}`);
    }
    // Detect backends
    process.stdout.write('\n  Detecting available backends …');
    const det = await detectBackends();
    process.stdout.write(' done.\n');
    printDetection(det);
    const hasAnyBackend = det.ollamaAvailable || det.openaiAvailable || det.anthropicAvailable || det.qwenAvailable;
    if (!hasAnyBackend && !args.yes) {
        noBackendQuickstart();
        const proceed = await confirm('  Continue and configure rule_only mode?', false);
        if (!proceed) {
            console.log('  Aborted. Run cogmem-init again after setting up a backend.');
            process.exit(0);
        }
    }
    // Detect OpenClaw workspace
    const oclawDet = detectOpenClaw(process.cwd());
    if (args.yes) {
        const embedding = suggestEmbeddingModel(det);
        const memory = suggestMemoryModel(det);
        const reasoning = suggestReasoningModel(det);
        const cfg = {
            dbPath: args.legacyEnv ? './cogmem.db' : 'memory.db',
            vectorBackend: 'sqlite-vec',
            embeddingProvider: embedding.provider,
            embeddingBaseUrl: embedding.baseUrl,
            embeddingModel: embedding.model,
            memoryProvider: memory.provider,
            memoryBaseUrl: memory.baseUrl,
            memoryApiKey: memory.apiKey,
            memoryModel: memory.model,
            reasoningProvider: reasoning.provider,
            reasoningBaseUrl: reasoning.baseUrl,
            reasoningApiKey: reasoning.apiKey,
            reasoningModel: reasoning.model,
            piiEmail: true,
            piiPhone: true,
            piiSsn: true,
            encryptionPassphrase: '',
            openClawEnabled: args.agent === 'openclaw' || (args.agent === 'auto' && oclawDet.detected),
            hermesEnabled: args.agent === 'hermes',
        };
        const lines = args.legacyEnv ? buildEnvLines(cfg) : buildTomlLines(cfg);
        const outputPath = args.legacyEnv ? target.envPath : target.configPath;
        if (args.dryRun) {
            console.log('');
            console.log(`  Dry run config for ${outputPath}:`);
            console.log(lines.join('\n'));
            console.log('');
            return;
        }
        if (existsSync(outputPath)) {
            console.log(`  Aborted — config already exists at ${outputPath}. Use interactive mode to overwrite.`);
            process.exit(1);
        }
        if (!args.legacyEnv)
            ensureInstallDirs(target.homeDir);
        writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
        console.log(`  Configuration written to ${outputPath}`);
        if (!args.legacyEnv) {
            console.log(`  Cogmem home ${target.homeDir}`);
            console.log(`  Database    ${join(target.homeDir, cfg.dbPath)}`);
            console.log(`  Snapshots   ${join(target.homeDir, 'snapshots')}`);
        }
        printUsageSnippet(cfg, args.legacyEnv);
        return;
    }
    // Run all wizard steps
    const dbPath = await stepDatabase();
    const vectorBackend = await stepVectorBackend();
    const embedding = await stepEmbedding(det);
    const models = await stepModelRoles(det);
    const governance = await stepGovernance();
    const openClawEnabled = args.agent === 'openclaw'
        ? true
        : args.agent === 'auto'
            ? await stepOpenClaw(oclawDet)
            : false;
    const hermesEnabled = args.agent === 'hermes';
    // Compose final config
    const cfg = {
        dbPath,
        vectorBackend,
        embeddingProvider: embedding.provider,
        embeddingBaseUrl: embedding.baseUrl,
        embeddingModel: embedding.model,
        ...models,
        ...governance,
        openClawEnabled,
        hermesEnabled,
    };
    const outputPath = args.legacyEnv ? target.envPath : target.configPath;
    const alreadyExists = existsSync(outputPath);
    if (alreadyExists) {
        const overwrite = await confirm(`\n  ${outputPath} already exists. Overwrite?`, false);
        if (!overwrite) {
            console.log('  Aborted — existing config left unchanged.');
            process.exit(0);
        }
    }
    const lines = args.legacyEnv ? buildEnvLines(cfg) : buildTomlLines(cfg);
    if (!args.legacyEnv)
        ensureInstallDirs(target.homeDir);
    writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
    // Summary
    console.log('');
    console.log('  ─────────────────────────────────────────────────────────────');
    console.log(`  Configuration written to ${outputPath}`);
    if (!args.legacyEnv) {
        console.log(`  Cogmem home    ${target.homeDir}`);
        console.log(`  Config         ${target.configPath}`);
        console.log(`  Database       ${join(target.homeDir, cfg.dbPath)}`);
        console.log(`  Snapshots      ${join(target.homeDir, 'snapshots')}`);
    }
    console.log('');
    console.log(`  DB             ${cfg.dbPath}`);
    console.log(`  Vector backend ${cfg.vectorBackend}`);
    console.log(`  Embedding      ${cfg.embeddingProvider} / ${cfg.embeddingModel}`);
    console.log(`  Memory model   ${cfg.memoryProvider} / ${cfg.memoryModel}`);
    console.log(`  Reasoning      ${cfg.reasoningProvider} / ${cfg.reasoningModel}`);
    console.log(`  PII redaction  email=${cfg.piiEmail} phone=${cfg.piiPhone} ssn=${cfg.piiSsn}`);
    console.log(`  Encryption     ${cfg.encryptionPassphrase ? 'AES-256-GCM enabled' : 'disabled'}`);
    console.log(`  OpenClaw       ${cfg.openClawEnabled ? 'enabled' : 'disabled'}`);
    console.log(`  Hermes         ${cfg.hermesEnabled ? 'enabled' : 'disabled'}`);
    printUsageSnippet(cfg, args.legacyEnv);
    if (args.legacyEnv) {
        console.log('');
        console.log('  To load the env file in your shell:');
        console.log('    export $(grep -v "^#" .agent-brain.env | xargs)');
        console.log('');
    }
    console.log('  Done. ✓');
    console.log('');
}
main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});

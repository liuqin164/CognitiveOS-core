import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { AesGcmEncryptionProvider } from '../encryption/index.js';
export function defaultCogmemHome(env = process.env) {
    if (env.COGMEM_HOME?.trim())
        return expandHome(env.COGMEM_HOME.trim(), env);
    return join(env.HOME || homedir(), '.cogmem');
}
export function defaultCogmemConfigPath(env = process.env) {
    return join(defaultCogmemHome(env), 'config.toml');
}
export function resolveCogmemConfigPath(options = {}) {
    const cwd = resolve(options.cwd || process.cwd());
    const env = options.env || process.env;
    const explicit = options.configPath || env.COGMEM_CONFIG;
    if (explicit?.trim()) {
        return { kind: 'toml', path: resolvePath(explicit.trim(), cwd, env) };
    }
    const projectConfig = findUp(cwd, join('.cogmem', 'config.toml'));
    if (projectConfig)
        return { kind: 'toml', path: projectConfig };
    const globalConfig = defaultCogmemConfigPath(env);
    if (existsSync(globalConfig))
        return { kind: 'toml', path: globalConfig };
    const legacyEnv = findUp(cwd, '.agent-brain.env');
    if (legacyEnv)
        return { kind: 'env', path: legacyEnv };
    return { kind: 'missing', path: globalConfig };
}
export function loadCogmemConfig(options = {}) {
    const resolution = resolveCogmemConfigPath(options);
    if (resolution.kind !== 'toml') {
        throw new Error(resolution.kind === 'env'
            ? `Found legacy env config at ${resolution.path}; pass it to createMemoryKernelFromEnv() or migrate it with cogmem-init.`
            : `Missing cogmem config at ${resolution.path}. Run cogmem-init first.`);
    }
    const env = options.env || process.env;
    const configPath = resolution.path;
    const homeDir = dirname(configPath);
    const diagnostics = [];
    let parsed;
    try {
        parsed = Bun.TOML.parse(readFileSync(configPath, 'utf8'));
    }
    catch (error) {
        diagnostics.push({
            severity: 'error',
            code: 'invalid_toml',
            message: error instanceof Error ? error.message : String(error),
        });
        parsed = {};
    }
    const root = asRecord(parsed);
    const core = section(root, 'core');
    const paths = section(root, 'paths');
    const embedding = section(root, 'embedding');
    const memoryModel = section(root, 'memory_model');
    const reasoningModel = section(root, 'reasoning_model');
    const governance = section(root, 'governance');
    const integrations = section(root, 'integrations');
    const openclaw = section(integrations, 'openclaw');
    const hermes = section(integrations, 'hermes');
    const optionsOut = {};
    const envOut = {};
    const dbPath = stringValue(core.db_path) || 'memory.db';
    optionsOut.dbPath = resolveConfigPath(interpolate(dbPath, env, diagnostics), homeDir, env);
    envOut.COGMEM_DB = optionsOut.dbPath;
    const vectorBackend = stringValue(core.vector_backend) || 'sqlite-vec';
    if (vectorBackend === 'sqlite-vec' || vectorBackend === 'hnswlib') {
        optionsOut.vectorBackend = vectorBackend;
        envOut.COGMEM_VECTOR_BACKEND = vectorBackend;
    }
    else {
        diagnostics.push({
            severity: 'error',
            code: 'invalid_vector_backend',
            message: 'core.vector_backend must be sqlite-vec or hnswlib.',
        });
    }
    const redactionPolicy = {};
    const piiEmail = booleanValue(governance.pii_redact_email);
    const piiPhone = booleanValue(governance.pii_redact_phone);
    const piiSsn = booleanValue(governance.pii_redact_ssn);
    if (piiEmail !== undefined) {
        redactionPolicy.email = piiEmail;
        envOut.COGMEM_PII_REDACT_EMAIL = String(piiEmail);
    }
    if (piiPhone !== undefined) {
        redactionPolicy.phone = piiPhone;
        envOut.COGMEM_PII_REDACT_PHONE = String(piiPhone);
    }
    if (piiSsn !== undefined) {
        redactionPolicy.ssn = piiSsn;
        envOut.COGMEM_PII_REDACT_SSN = String(piiSsn);
    }
    if (Object.keys(redactionPolicy).length > 0)
        optionsOut.redactionPolicy = redactionPolicy;
    const encryptionEnabled = booleanValue(governance.encryption) === true;
    const encryptionPassphrase = interpolate(stringValue(governance.encryption_passphrase) || stringValue(governance.passphrase) || '', env, diagnostics);
    if (encryptionPassphrase)
        envOut.COGMEM_ENCRYPTION_PASSPHRASE = encryptionPassphrase;
    if (encryptionEnabled) {
        if (encryptionPassphrase) {
            optionsOut.encryptionProvider = AesGcmEncryptionProvider.fromPassphrase(encryptionPassphrase);
        }
        else {
            diagnostics.push({
                severity: 'error',
                code: 'missing_encryption_passphrase',
                message: 'governance.encryption is true but governance.encryption_passphrase is empty.',
            });
        }
    }
    applyRoleEnv(envOut, 'EMBEDDING', embedding, env, diagnostics);
    applyRoleEnv(envOut, 'MEMORY', memoryModel, env, diagnostics, 'rule_only');
    applyRoleEnv(envOut, 'REASONING', reasoningModel, env, diagnostics, 'memory');
    const embeddingsDir = resolveConfigPath(interpolate(stringValue(paths.embeddings_dir) || 'embeddings', env, diagnostics), homeDir, env);
    const snapshotsDir = resolveConfigPath(interpolate(stringValue(paths.snapshots_dir) || 'snapshots', env, diagnostics), homeDir, env);
    const logsDir = resolveConfigPath(interpolate(stringValue(paths.logs_dir) || 'logs', env, diagnostics), homeDir, env);
    const openclawEnabled = booleanValue(openclaw.enabled) === true;
    const hermesEnabled = booleanValue(hermes.enabled) === true;
    const openclawWorkspaceDir = maybeResolveWorkspace(openclaw.workspace_dir, homeDir, env, diagnostics);
    const hermesWorkspaceDir = maybeResolveWorkspace(hermes.workspace_dir, homeDir, env, diagnostics);
    if (openclawEnabled) {
        envOut.COGMEM_OPENCLAW_ENABLED = 'true';
        if (openclawWorkspaceDir)
            envOut.COGMEM_OPENCLAW_WORKSPACE_DIR = openclawWorkspaceDir;
    }
    if (hermesEnabled) {
        envOut.COGMEM_HERMES_ENABLED = 'true';
        if (hermesWorkspaceDir)
            envOut.COGMEM_HERMES_WORKSPACE_DIR = hermesWorkspaceDir;
    }
    return {
        configPath,
        homeDir,
        options: optionsOut,
        env: envOut,
        paths: { embeddingsDir, snapshotsDir, logsDir },
        integrations: {
            openclaw: { enabled: openclawEnabled, workspaceDir: openclawWorkspaceDir },
            hermes: { enabled: hermesEnabled, workspaceDir: hermesWorkspaceDir },
        },
        diagnostics,
    };
}
export function applyCogmemConfigToEnv(loaded, targetEnv = process.env) {
    for (const [key, value] of Object.entries(loaded.env)) {
        targetEnv[key] = value;
    }
}
function applyRoleEnv(target, role, values, env, diagnostics, fallback) {
    const prefix = `AGENT_BRAIN_MODEL_${role}`;
    const provider = normalizeRoleProvider(role, stringValue(values.provider), diagnostics);
    const baseUrl = stringValue(values.base_url);
    const model = stringValue(values.model) || defaultRoleModel(role);
    const apiKey = stringValue(values.api_key);
    const timeoutMs = numberValue(values.timeout_ms) ?? defaultRoleTimeout(role);
    target[`${prefix}_PROVIDER`] = provider;
    target[`${prefix}_BASE_URL`] = baseUrl
        ? interpolate(baseUrl, env, diagnostics)
        : provider === 'openai_compatible'
            ? 'http://localhost:11434/v1'
            : '';
    target[`${prefix}_API_KEY`] = apiKey ? interpolate(apiKey, env, diagnostics) : '';
    target[`${prefix}_NAME`] = interpolate(model, env, diagnostics);
    target[`${prefix}_TIMEOUT_MS`] = String(timeoutMs);
    if (fallback)
        target[`${prefix}_FALLBACK`] = fallback;
}
function normalizeRoleProvider(role, rawProvider, diagnostics) {
    const provider = rawProvider || defaultRoleProvider(role);
    const valid = role === 'EMBEDDING'
        ? ['deterministic_local', 'openai_compatible']
        : ['rule_only', 'openai_compatible', 'anthropic'];
    if (valid.includes(provider))
        return provider;
    diagnostics.push({
        severity: 'error',
        code: 'invalid_model_provider',
        message: `${role.toLowerCase()} provider must be one of: ${valid.join(', ')}.`,
    });
    return defaultRoleProvider(role);
}
function defaultRoleProvider(role) {
    return role === 'EMBEDDING' ? 'deterministic_local' : 'rule_only';
}
function defaultRoleModel(role) {
    return role === 'EMBEDDING' ? 'deterministic_local' : 'rule_only';
}
function defaultRoleTimeout(role) {
    return role === 'EMBEDDING' ? 30000 : 60000;
}
function maybeResolveWorkspace(value, baseDir, env, diagnostics) {
    const raw = stringValue(value);
    if (!raw)
        return undefined;
    return resolveConfigPath(interpolate(raw, env, diagnostics), baseDir, env);
}
function interpolate(value, env, diagnostics) {
    return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => {
        const resolved = env[key];
        if (resolved === undefined) {
            diagnostics.push({
                severity: 'warning',
                code: 'missing_env',
                message: `Environment variable ${key} is not set.`,
            });
            return '';
        }
        return resolved;
    });
}
function resolveConfigPath(value, baseDir, env) {
    return resolvePath(value, baseDir, env);
}
function resolvePath(value, baseDir, env) {
    const expanded = expandHome(value, env);
    return isAbsolute(expanded) ? expanded : resolve(baseDir, expanded);
}
function expandHome(value, env) {
    if (value === '~')
        return env.HOME || homedir();
    if (value.startsWith('~/'))
        return join(env.HOME || homedir(), value.slice(2));
    return value;
}
function findUp(start, relativePath) {
    let current = resolve(start);
    while (true) {
        const candidate = join(current, relativePath);
        if (existsSync(candidate))
            return candidate;
        const parent = dirname(current);
        if (parent === current)
            return undefined;
        current = parent;
    }
}
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function section(root, key) {
    return asRecord(root[key]);
}
function stringValue(value) {
    return typeof value === 'string' ? value : undefined;
}
function booleanValue(value) {
    return typeof value === 'boolean' ? value : undefined;
}
function numberValue(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

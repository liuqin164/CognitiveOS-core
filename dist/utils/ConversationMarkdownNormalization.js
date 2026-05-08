import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const NORMALIZED_SOURCE_FAMILY = 'normalized_conversation_markdown';
const NORMALIZATION_CONTRACT_VERSION = 'v1';
const DEFAULT_ONBOARDING_PATH = 'export/preprocess -> normalize -> batch:preflight -> batch:consolidate --strict -> recall';
export function parseNormalizerArgs(argv, usage) {
    const args = argv[0] === '--' ? argv.slice(1) : argv;
    const result = {
        title: 'Normalized Conversation Export',
        format: undefined
    };
    for (let index = 0; index < args.length; index += 1) {
        const token = args[index];
        if (token === '--input')
            result.input = args[index + 1];
        if (token === '--output')
            result.output = args[index + 1];
        if (token === '--title')
            result.title = args[index + 1];
        if (token === '--format') {
            const format = args[index + 1];
            if (format === 'csv' || format === 'tsv')
                result.format = format;
        }
        if (token.startsWith('--'))
            index += 1;
    }
    if (!result.input || !result.output) {
        throw new Error(usage);
    }
    return result;
}
export function normalizeRole(input) {
    const lowered = (input || '').trim().toLowerCase();
    if (['assistant', 'agent', 'ai', 'bot', 'model'].includes(lowered))
        return 'agent';
    if (['system', 'sys'].includes(lowered))
        return 'system';
    if (['narrator', 'note', 'notes', 'memo'].includes(lowered))
        return 'narrator';
    return 'user';
}
export function pickMessageText(item) {
    const direct = coerceText(item.content) || coerceText(item.text) || coerceText(item.message);
    return direct.trim();
}
export function pickTimestamp(item, fallback) {
    const raw = coerceText(item.timestamp)
        || coerceText(item.created_at)
        || coerceText(item.createdAt)
        || coerceText(item.time);
    const date = raw ? new Date(raw) : new Date(fallback);
    const usable = Number.isNaN(date.getTime()) ? new Date(fallback) : date;
    return usable.toISOString();
}
export function writeNormalizedConversationMarkdown(outputPath, title, family, messages, markers = []) {
    assertNormalizedMessages(messages, family);
    const uniqueMarkers = dedupeMarkers(markers);
    const content = [
        `# ${title}`,
        '',
        '<!-- agent-brain-normalized: true -->',
        `<!-- agent-brain-normalization-contract: ${NORMALIZATION_CONTRACT_VERSION} -->`,
        `<!-- agent-brain-normalized-source-family: ${NORMALIZED_SOURCE_FAMILY} -->`,
        `<!-- agent-brain-original-input-family: ${family} -->`,
        `<!-- agent-brain-normalized-from: ${family} -->`,
        `<!-- agent-brain-normalized-title: ${escapeMarkerValue(title)} -->`,
        `<!-- agent-brain-onboarding-path: ${DEFAULT_ONBOARDING_PATH} -->`,
        ...uniqueMarkers.map((marker) => `<!-- ${marker.key}: ${escapeMarkerValue(marker.value)} -->`),
        '',
        ...messages.map((message) => `- [${message.timestamp}] ${message.role}: ${message.text}`)
    ].join('\n');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content);
}
export function normalizeJsonlRecords(inputPath) {
    const input = readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n');
    const lines = input.split('\n').filter((line) => line.trim());
    return lines.flatMap((line, index) => normalizeLooseRecord(JSON.parse(line), index));
}
export function normalizeJsonArrayRecords(inputPath) {
    const parsed = JSON.parse(readFileSync(inputPath, 'utf8'));
    if (!Array.isArray(parsed)) {
        throw new Error('Expected a top-level JSON array.');
    }
    return parsed.flatMap((item, index) => normalizeLooseRecord(asLooseRecord(item), index));
}
export function normalizeDelimitedRecords(inputPath, format) {
    const input = readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n');
    const delimiter = resolveDelimiter(inputPath, input, format);
    const family = delimiter === '\t' ? 'tsv_transcript_export' : 'csv_transcript_export';
    const rows = parseDelimited(input, delimiter);
    if (rows.length === 0) {
        throw new Error('Expected a header row plus at least one transcript row.');
    }
    const headers = rows[0].map((cell) => normalizeHeader(cell));
    const messages = rows.slice(1).flatMap((row, index) => {
        const record = {};
        headers.forEach((header, columnIndex) => {
            if (!header)
                return;
            record[header] = row[columnIndex] ?? '';
        });
        return normalizeLooseRecord(record, index);
    });
    return { family, messages };
}
export function detectNormalizationFamily(markdown) {
    return parseNormalizationMetadata(markdown).originalInputFamily;
}
export function parseNormalizationMetadata(markdown) {
    const legacyFamily = readMarker(markdown, 'agent-brain-normalized-from');
    const originalInputFamily = readMarker(markdown, 'agent-brain-original-input-family') || legacyFamily;
    const normalizedSourceFamily = readMarker(markdown, 'agent-brain-normalized-source-family');
    const contractVersion = readMarker(markdown, 'agent-brain-normalization-contract');
    const normalizedValue = readMarker(markdown, 'agent-brain-normalized');
    const title = readMarker(markdown, 'agent-brain-normalized-title');
    const onboardingPath = readMarker(markdown, 'agent-brain-onboarding-path');
    const family = originalInputFamily;
    if (family !== 'jsonl_transcript_export'
        && family !== 'json_array_transcript_export'
        && family !== 'csv_transcript_export'
        && family !== 'tsv_transcript_export'
        && family !== 'app_private_mixed_event_export'
        && family !== 'jsonl_mixed_event_log_export') {
        return {
            isNormalized: normalizedValue === 'true' || Boolean(legacyFamily)
        };
    }
    return {
        isNormalized: normalizedValue === 'true' || Boolean(legacyFamily),
        contractVersion: contractVersion === NORMALIZATION_CONTRACT_VERSION ? NORMALIZATION_CONTRACT_VERSION : undefined,
        normalizedSourceFamily: normalizedSourceFamily === NORMALIZED_SOURCE_FAMILY ? NORMALIZED_SOURCE_FAMILY : undefined,
        originalInputFamily: family,
        title,
        onboardingPath
    };
}
export function createConversationMarkdownNormalizer(options) {
    return (records) => records.flatMap((record, index) => {
        const mapped = options.mapRecord(record, index);
        if (!mapped)
            return [];
        const entries = Array.isArray(mapped) ? mapped : [mapped];
        return entries.filter((entry) => entry.text.trim());
    });
}
export function normalizeAppPrivateMixedEventRecords(inputPath) {
    return normalizeAppPrivateMixedEventExport(inputPath).messages;
}
export function normalizeAppPrivateMixedEventExport(inputPath) {
    const parsed = JSON.parse(readFileSync(inputPath, 'utf8'));
    return normalizeEventExportToConversationMarkdown(parsed, createExportBridge({
        inputFamily: 'app_private_mixed_event_export',
        selectRecords: (root) => {
            const events = root.events;
            return Array.isArray(events) ? events.map((item) => asLooseRecord(item)) : [];
        },
        isMessageCandidate: (event) => {
            const eventKind = coerceText(event.kind) || coerceText(event.type) || coerceText(event.eventType);
            return eventKind.toLowerCase() === 'message';
        },
        mapRole: (event) => {
            const actor = asLooseRecord(event.actor);
            return coerceText(actor.role) || coerceText(actor.type) || coerceText(event.role);
        },
        extractText: (event) => {
            const body = asLooseRecord(event.body);
            return (coerceText(body.text)
                || coerceText(body.content)
                || coerceText(body.message)
                || coerceText(event.text)
                || coerceText(event.message)).trim();
        },
        resolveTimestamp: (event, context) => pickTimestamp({
            timestamp: coerceText(event.occurred_at) || coerceText(event.timestamp),
            created_at: coerceText(event.created_at),
            createdAt: coerceText(event.createdAt),
            time: coerceText(event.time)
        }, Date.now() + context.index * 1000),
        emitMarkers: (event) => {
            const actor = asLooseRecord(event.actor);
            const kind = coerceText(event.kind) || coerceText(event.type) || coerceText(event.eventType);
            return [
                { key: 'agent-brain-bridge-input-family', value: 'app_private_mixed_event_export' },
                { key: 'agent-brain-bridge-event-selector', value: 'kind/type/eventType == message' },
                { key: 'agent-brain-bridge-role-source', value: coerceText(actor.role) ? 'actor.role' : coerceText(actor.type) ? 'actor.type' : 'event.role' },
                { key: 'agent-brain-bridge-text-source', value: pickFirstMarkerValue([
                        [coerceText(asLooseRecord(event.body).text), 'body.text'],
                        [coerceText(asLooseRecord(event.body).content), 'body.content'],
                        [coerceText(asLooseRecord(event.body).message), 'body.message'],
                        [coerceText(event.text), 'event.text'],
                        [coerceText(event.message), 'event.message']
                    ]) || 'unknown' },
                { key: 'agent-brain-bridge-timestamp-source', value: pickFirstMarkerValue([
                        [coerceText(event.occurred_at), 'occurred_at'],
                        [coerceText(event.timestamp), 'timestamp'],
                        [coerceText(event.created_at), 'created_at'],
                        [coerceText(event.createdAt), 'createdAt'],
                        [coerceText(event.time), 'time']
                    ]) || 'normalization_fallback' }
            ];
        }
    }));
}
export function normalizeJsonlMixedEventLogRecords(inputPath) {
    return normalizeJsonlMixedEventLogExport(inputPath).messages;
}
export function normalizeJsonlMixedEventLogExport(inputPath) {
    const input = readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n');
    const events = input
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => asLooseRecord(JSON.parse(line)));
    return normalizeEventExportToConversationMarkdown(events, createExportBridge({
        inputFamily: 'jsonl_mixed_event_log_export',
        selectRecords: (root) => root,
        isMessageCandidate: (event) => {
            const eventType = (coerceText(event.type) || coerceText(event.kind)).toLowerCase();
            return (eventType === 'message'
                || eventType === 'message.created'
                || eventType === 'message.appended');
        },
        mapRole: (event) => {
            const payload = asLooseRecord(event.payload);
            const actor = asLooseRecord(event.actor);
            return coerceText(payload.role) || coerceText(actor.role) || coerceText(actor.type) || coerceText(event.role);
        },
        extractText: (event) => {
            const payload = asLooseRecord(event.payload);
            return (coerceText(payload.text)
                || coerceText(payload.content)
                || coerceText(payload.message)
                || coerceText(event.message)
                || coerceText(event.text)).trim();
        },
        resolveTimestamp: (event, context) => {
            const payload = asLooseRecord(event.payload);
            return pickTimestamp({
                timestamp: coerceText(payload.timestamp) || coerceText(event.timestamp),
                created_at: coerceText(event.created_at) || coerceText(payload.created_at),
                createdAt: coerceText(event.createdAt) || coerceText(payload.createdAt),
                time: coerceText(event.time)
            }, Date.now() + context.index * 1000);
        },
        emitMarkers: (event) => {
            const payload = asLooseRecord(event.payload);
            return [
                { key: 'agent-brain-bridge-input-family', value: 'jsonl_mixed_event_log_export' },
                { key: 'agent-brain-bridge-event-selector', value: 'type/kind in message-like events with text payload' },
                { key: 'agent-brain-bridge-role-source', value: pickFirstMarkerValue([
                        [coerceText(payload.role), 'payload.role'],
                        [coerceText(asLooseRecord(event.actor).role), 'actor.role'],
                        [coerceText(asLooseRecord(event.actor).type), 'actor.type'],
                        [coerceText(event.role), 'event.role']
                    ]) || 'user_fallback' },
                { key: 'agent-brain-bridge-text-source', value: pickFirstMarkerValue([
                        [coerceText(payload.text), 'payload.text'],
                        [coerceText(payload.content), 'payload.content'],
                        [coerceText(payload.message), 'payload.message'],
                        [coerceText(event.message), 'event.message'],
                        [coerceText(event.text), 'event.text']
                    ]) || 'unknown' },
                { key: 'agent-brain-bridge-timestamp-source', value: pickFirstMarkerValue([
                        [coerceText(payload.timestamp), 'payload.timestamp'],
                        [coerceText(event.timestamp), 'event.timestamp'],
                        [coerceText(event.created_at), 'event.created_at'],
                        [coerceText(payload.created_at), 'payload.created_at'],
                        [coerceText(event.createdAt), 'event.createdAt'],
                        [coerceText(payload.createdAt), 'payload.createdAt'],
                        [coerceText(event.time), 'event.time']
                    ]) || 'normalization_fallback' }
            ];
        }
    }));
}
export function createExportBridge(recipe) {
    const createContext = (record, index, root, records) => ({
        index,
        record,
        root,
        inputFamily: recipe.inputFamily
    });
    const normalizeRecords = (records, root) => records.flatMap((record, index) => {
        const resolvedRoot = (root ?? records);
        const context = createContext(record, index, resolvedRoot, records);
        if (recipe.isMessageCandidate && !recipe.isMessageCandidate(record, context)) {
            return [];
        }
        const text = (recipe.extractText(record, context) || '').trim();
        if (!text)
            return [];
        return [{
                role: normalizeRole(recipe.mapRole(record, context)),
                text,
                timestamp: recipe.resolveTimestamp(record, context)
            }];
    });
    const normalizeRoot = (input) => {
        const records = recipe.selectRecords ? recipe.selectRecords(input) : input;
        return normalizeRecords(records, input);
    };
    const collectMarkers = (records, root) => {
        if (!recipe.emitMarkers)
            return [];
        const resolvedRoot = (root ?? records);
        return dedupeMarkers(records.flatMap((record, index) => {
            const context = createContext(record, index, resolvedRoot, records);
            if (recipe.isMessageCandidate && !recipe.isMessageCandidate(record, context)) {
                return [];
            }
            return recipe.emitMarkers?.(record, context) || [];
        }));
    };
    const collectRootMarkers = (input) => {
        const records = recipe.selectRecords ? recipe.selectRecords(input) : input;
        return collectMarkers(records, input);
    };
    return {
        inputFamily: recipe.inputFamily,
        normalizeRoot,
        normalizeRecords,
        collectMarkers,
        collectRootMarkers
    };
}
export function normalizeEventExportToConversationMarkdown(input, bridge) {
    const messages = bridge.normalizeRoot(input);
    assertBridgeMessages(messages, bridge.inputFamily);
    return {
        family: bridge.inputFamily,
        messages,
        markers: bridge.collectRootMarkers(input)
    };
}
function assertBridgeMessages(messages, family) {
    if (messages.length > 0)
        return;
    throw new Error(`Bridge normalization failed for ${family}: no message records were produced. Check selectRecords, isMessageCandidate, extractText, resolveTimestamp, and confirm the export exposes stable text/timestamp fields.`);
}
function assertNormalizedMessages(messages, family) {
    if (messages.length === 0) {
        throw new Error(`Normalization failed for ${family}: no conversation messages were produced.`);
    }
    for (const [index, message] of messages.entries()) {
        if (!message.text.trim()) {
            throw new Error(`Normalization failed for ${family}: message ${index} is missing text.`);
        }
        const timestamp = new Date(message.timestamp);
        if (Number.isNaN(timestamp.getTime())) {
            throw new Error(`Normalization failed for ${family}: message ${index} has an invalid timestamp.`);
        }
    }
}
function readMarker(markdown, marker) {
    const pattern = new RegExp(`<!--\\s*${marker}:\\s*([^]+?)\\s*-->`, 'i');
    const match = markdown.match(pattern);
    return match?.[1]?.trim();
}
function escapeMarkerValue(value) {
    return value.replace(/-->/g, '--&gt;').trim();
}
function dedupeMarkers(markers) {
    const seen = new Set();
    const output = [];
    for (const marker of markers) {
        const key = marker.key.trim();
        const value = marker.value.trim();
        if (!key || !value)
            continue;
        const identity = `${key}::${value}`;
        if (seen.has(identity))
            continue;
        seen.add(identity);
        output.push({ key, value });
    }
    return output;
}
function normalizeLooseRecord(item, index) {
    const text = pickMessageText(item);
    if (!text)
        return [];
    return [{
            role: normalizeRole(coerceText(item.role)),
            text,
            timestamp: pickTimestamp(item, Date.now() + index * 1000)
        }];
}
function coerceText(value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value)) {
        return value
            .map((entry) => {
            if (typeof entry === 'string')
                return entry;
            if (entry && typeof entry === 'object' && typeof entry.text === 'string') {
                return entry.text;
            }
            return '';
        })
            .filter(Boolean)
            .join('\n');
    }
    if (value && typeof value === 'object' && typeof value.text === 'string') {
        return value.text;
    }
    return '';
}
function pickFirstMarkerValue(candidates) {
    for (const [value, label] of candidates) {
        if (value.trim())
            return label;
    }
    return undefined;
}
function asLooseRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return value;
}
function resolveDelimiter(inputPath, input, format) {
    if (format === 'csv')
        return ',';
    if (format === 'tsv')
        return '\t';
    if (inputPath.toLowerCase().endsWith('.tsv'))
        return '\t';
    const firstLine = input.split('\n').find((line) => line.trim()) || '';
    return firstLine.includes('\t') ? '\t' : ',';
}
function normalizeHeader(value) {
    return value.trim().toLowerCase().replace(/\s+/g, '_');
}
function parseDelimited(input, delimiter) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let index = 0; index < input.length; index += 1) {
        const char = input[index];
        const next = input[index + 1];
        if (char === '"') {
            if (inQuotes && next === '"') {
                cell += '"';
                index += 1;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (!inQuotes && char === delimiter) {
            row.push(cell);
            cell = '';
            continue;
        }
        if (!inQuotes && char === '\n') {
            row.push(cell);
            if (row.some((value) => value.trim())) {
                rows.push(row);
            }
            row = [];
            cell = '';
            continue;
        }
        cell += char;
    }
    row.push(cell);
    if (row.some((value) => value.trim())) {
        rows.push(row);
    }
    return rows;
}

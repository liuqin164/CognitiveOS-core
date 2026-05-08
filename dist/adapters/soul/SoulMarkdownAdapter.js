import { computeStableHash, inferSourceTitle, normalizeMarkdownText, parseLooseDateHeading, parseLooseTimestamp, parseMarkdownRoleLine, resolveTimestampWithContext } from '../types.js';
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
export class SoulMarkdownAdapter {
    kind = 'soul_markdown';
    adapterVersion = 'soul-markdown-v2';
    adapt(source, snapshot, window) {
        const normalized = normalizeMarkdownText(snapshot.content);
        const { frontmatter, body } = this.extractFrontmatter(normalized);
        const sections = this.parseSections(body);
        const diagnostics = [];
        const title = inferSourceTitle(source.sourcePath).toLowerCase();
        const defaultKind = this.inferDocumentKind(frontmatter.type || title);
        const defaultTimestamp = parseLooseTimestamp(frontmatter.created_at || frontmatter.date, snapshot.fileMtimeMs);
        if (!frontmatter.type && !frontmatter.created_at && !frontmatter.date) {
            diagnostics.push({
                severity: 'warning',
                code: 'soul_missing_frontmatter_fields',
                message: 'Soul-like markdown is missing type/date frontmatter; the adapter fell back to filename and file mtime.',
                filePath: source.sourcePath,
                adapterKind: this.kind,
                contractHint: 'Preferred fields are type plus created_at/date, but partial files are still ingested.',
                fallbackHint: 'If time placement matters, add frontmatter or pass the file through the correct daily window.'
            });
        }
        const allRecords = sections
            .flatMap((section, index) => this.sectionToRecords(source, snapshot, section, {
            defaultKind,
            defaultTimestamp: defaultTimestamp + index,
            projectId: frontmatter.project_id
        }));
        const records = allRecords
            .filter((record) => !window || (record.timestamp >= window.start && record.timestamp < window.end));
        return {
            source: {
                ...source,
                projectId: source.projectId || frontmatter.project_id
            },
            snapshot: {
                sourceId: snapshot.sourceId,
                adapterKind: snapshot.adapterKind,
                sourcePath: snapshot.sourcePath,
                projectId: source.projectId || frontmatter.project_id,
                fileHash: snapshot.fileHash,
                fileMtimeMs: snapshot.fileMtimeMs,
                fileSize: snapshot.fileSize,
                readAt: snapshot.readAt
            },
            records,
            diagnostics: allRecords.length > 0
                ? diagnostics
                : [
                    ...diagnostics,
                    {
                        severity: 'error',
                        code: 'soul_contract_mismatch',
                        message: 'No ingestable soul/reflection/note content was found.',
                        filePath: source.sourcePath,
                        adapterKind: this.kind,
                        contractHint: 'Expected headings, note paragraphs, or message-like lines inside a markdown note.',
                        fallbackHint: 'Use repeated --soul for note-style files; if this is actually a transcript, pass it through --conversation instead.'
                    }
                ]
        };
    }
    extractFrontmatter(content) {
        const match = content.match(FRONTMATTER_RE);
        if (!match)
            return { frontmatter: {}, body: content };
        const frontmatter = {};
        for (const line of match[1].split('\n')) {
            const separator = line.indexOf(':');
            if (separator === -1)
                continue;
            const key = line.slice(0, separator).trim().toLowerCase();
            const value = line.slice(separator + 1).trim();
            if (key)
                frontmatter[key] = value;
        }
        return {
            frontmatter,
            body: content.slice(match[0].length).trim()
        };
    }
    parseSections(body) {
        const lines = body.split('\n');
        const sections = [];
        let current = null;
        let skipNextLine = false;
        const flush = () => {
            if (!current)
                return;
            const text = current.text.trim();
            if (text)
                sections.push({ ...current, text });
            current = null;
        };
        lines.forEach((line, index) => {
            if (skipNextLine) {
                skipNextLine = false;
                return;
            }
            const headingMatch = line.match(HEADING_RE) || this.matchLooseHeading(lines, index);
            if (headingMatch) {
                flush();
                const heading = headingMatch[2]?.trim() || headingMatch[1]?.trim();
                if (!heading)
                    return;
                if (/^[-=]{3,}$/.test(lines[index + 1]?.trim() || ''))
                    skipNextLine = true;
                current = {
                    heading,
                    text: '',
                    lineNumber: index + 1
                };
                return;
            }
            if (!current) {
                current = {
                    heading: undefined,
                    text: '',
                    lineNumber: index + 1
                };
            }
            current.text += `${current.text ? '\n' : ''}${line}`;
        });
        flush();
        return sections;
    }
    sectionToRecords(source, snapshot, section, defaults) {
        const records = [];
        const lines = section.text.split('\n');
        let currentMessage = null;
        let currentDateHint = parseLooseDateHeading(section.heading || '') || undefined;
        const pushMessage = () => {
            if (!currentMessage)
                return;
            const text = currentMessage.text.trim();
            if (!text)
                return;
            records.push(this.makeRecord(source, snapshot, {
                kind: 'raw_utterance',
                role: currentMessage.role,
                text,
                timestamp: currentMessage.timestamp,
                lineNumber: currentMessage.lineNumber,
                sectionHeading: section.heading
            }));
            currentMessage = null;
        };
        lines.forEach((line, index) => {
            const headingDate = parseLooseDateHeading(line);
            if (headingDate) {
                currentDateHint = headingDate;
                return;
            }
            const parsed = parseMarkdownRoleLine(line);
            if (parsed) {
                pushMessage();
                currentMessage = {
                    role: parsed.role,
                    text: parsed.text,
                    timestamp: resolveTimestampWithContext(parsed.timestamp, defaults.defaultTimestamp + index, currentDateHint),
                    lineNumber: section.lineNumber + index
                };
                return;
            }
            if (currentMessage) {
                currentMessage.text += `${currentMessage.text ? '\n' : ''}${line.trimEnd()}`;
            }
        });
        pushMessage();
        const residual = lines
            .filter((line) => !parseMarkdownRoleLine(line) && !parseLooseDateHeading(line))
            .join('\n')
            .trim();
        if (residual) {
            records.push(this.makeRecord(source, snapshot, {
                kind: this.inferSectionKind(section.heading, defaults.defaultKind),
                text: residual,
                timestamp: defaults.defaultTimestamp,
                lineNumber: section.lineNumber,
                sectionHeading: section.heading
            }));
        }
        return records;
    }
    makeRecord(source, snapshot, input) {
        const recordHash = computeStableHash([
            source.sourceId,
            input.kind,
            input.role,
            input.timestamp,
            input.text
        ]);
        const title = inferSourceTitle(source.sourcePath);
        const reliabilityClass = input.kind === 'raw_utterance'
            ? 'raw_utterance'
            : input.kind === 'reflection'
                ? 'reflection'
                : 'self_summary';
        return {
            recordId: `soul-${recordHash.slice(0, 16)}`,
            kind: input.kind,
            role: input.role,
            text: input.text,
            timestamp: input.timestamp,
            tags: [title, 'soul', reliabilityClass],
            confidenceHint: reliabilityClass === 'raw_utterance' ? 0.76 : reliabilityClass === 'reflection' ? 0.58 : 0.64,
            sourceTypeHint: reliabilityClass === 'raw_utterance'
                ? (input.role === 'agent' ? 'llm_inference' : 'user_input')
                : 'llm_inference',
            metadata: {
                lineNumber: input.lineNumber,
                sectionHeading: input.sectionHeading
            },
            provenance: {
                sourceId: source.sourceId,
                sourcePath: source.sourcePath,
                sourceType: this.kind,
                adapterVersion: this.adapterVersion,
                fileHash: snapshot.fileHash,
                fileMtimeMs: snapshot.fileMtimeMs,
                recordHash,
                reliabilityClass
            }
        };
    }
    inferDocumentKind(token) {
        const lowered = (token || '').toLowerCase();
        if (/reflect|reflection|retro|retrospective|catch-up|复盘|反思/.test(lowered))
            return 'reflection';
        if (/summary|memory-summary|wrap-up|digest|总结|摘要|概览/.test(lowered))
            return 'self_summary';
        return 'note';
    }
    inferSectionKind(heading, fallback) {
        if (!heading)
            return fallback;
        return this.inferDocumentKind(heading);
    }
    matchLooseHeading(lines, index) {
        const current = lines[index]?.trim();
        const next = lines[index + 1]?.trim();
        if (!current || !next)
            return null;
        const setext = current.match(/^([A-Za-z][A-Za-z /_-]{1,40}|[\u4e00-\u9fa5A-Za-z0-9 /_-]{1,20})$/);
        if (setext && /^[-=]{3,}$/.test(next))
            return [current, '#', current];
        const labeled = current.match(/^(Summary|Reflection|Notes|Memory Notes|Catch[- ]?Up|Persona|Identity|User Profile|用户画像|人格|反思|总结|备注)\s*:?$/i);
        if (labeled)
            return [current, '#', labeled[1]];
        return null;
    }
}

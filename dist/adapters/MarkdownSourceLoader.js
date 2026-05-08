import { readFileSync, statSync } from 'node:fs';
import { computeStableHash } from './types.js';
export class MarkdownSourceLoader {
    read(source) {
        const stat = statSync(source.sourcePath);
        const content = readFileSync(source.sourcePath, 'utf8');
        return {
            sourceId: source.sourceId,
            adapterKind: source.adapterKind,
            sourcePath: source.sourcePath,
            projectId: source.projectId,
            fileHash: computeStableHash([source.sourcePath, stat.mtimeMs, content]),
            fileMtimeMs: stat.mtimeMs,
            fileSize: stat.size,
            readAt: Date.now(),
            content
        };
    }
}

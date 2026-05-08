import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class SoulMarkdownAdapter implements SourceAdapter {
    readonly kind: "soul_markdown";
    private readonly adapterVersion;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
    private extractFrontmatter;
    private parseSections;
    private sectionToRecords;
    private makeRecord;
    private inferDocumentKind;
    private inferSectionKind;
    private matchLooseHeading;
}
//# sourceMappingURL=SoulMarkdownAdapter.d.ts.map
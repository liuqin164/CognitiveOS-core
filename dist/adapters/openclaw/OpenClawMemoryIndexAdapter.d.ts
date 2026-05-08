import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class OpenClawMemoryIndexAdapter implements SourceAdapter {
    readonly kind: "openclaw_memory_index";
    private readonly adapterVersion;
    private readonly delegate;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
}
//# sourceMappingURL=OpenClawMemoryIndexAdapter.d.ts.map
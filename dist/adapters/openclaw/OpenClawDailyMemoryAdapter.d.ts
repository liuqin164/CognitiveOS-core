import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class OpenClawDailyMemoryAdapter implements SourceAdapter {
    readonly kind: "openclaw_daily_memory";
    private readonly adapterVersion;
    private readonly delegate;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
}
//# sourceMappingURL=OpenClawDailyMemoryAdapter.d.ts.map
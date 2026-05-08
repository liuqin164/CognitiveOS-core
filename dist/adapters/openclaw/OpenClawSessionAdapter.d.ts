import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class OpenClawSessionAdapter implements SourceAdapter {
    readonly kind: "openclaw_session";
    private readonly adapterVersion;
    private readonly delegate;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
}
//# sourceMappingURL=OpenClawSessionAdapter.d.ts.map
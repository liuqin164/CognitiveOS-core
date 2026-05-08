import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class OpenClawPersonaAdapter implements SourceAdapter {
    readonly kind: "openclaw_persona";
    private readonly adapterVersion;
    private readonly delegate;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
}
//# sourceMappingURL=OpenClawPersonaAdapter.d.ts.map
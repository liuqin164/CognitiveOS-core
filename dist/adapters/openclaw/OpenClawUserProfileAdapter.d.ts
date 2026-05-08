import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class OpenClawUserProfileAdapter implements SourceAdapter {
    readonly kind: "openclaw_user_profile";
    private readonly adapterVersion;
    private readonly delegate;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
}
//# sourceMappingURL=OpenClawUserProfileAdapter.d.ts.map
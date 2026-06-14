import type { AdaptedSource, AdapterWindow, SourceAdapter, SourceDefinition, SourceFileSnapshot } from '../types.js';
export declare class HermesStateDbAdapter implements SourceAdapter {
    readonly kind: "hermes_state_db";
    private readonly adapterVersion;
    adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource;
    private toRecord;
    private result;
    private diagnostic;
}
//# sourceMappingURL=HermesStateDbAdapter.d.ts.map
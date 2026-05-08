export interface ConfigDiagnosticLike {
    severity: 'warning' | 'error';
    code: string;
    message: string;
}
export declare const DEFAULT_VECTOR_DIMENSION = 384;
export declare const HIGH_VECTOR_DIMENSION_THRESHOLD = 2048;
export declare const VECTOR_DIMENSION_ESTIMATE_COUNT = 100000;
export declare function parseVectorDimensionValue(value: unknown, fieldName: string, diagnostics: ConfigDiagnosticLike[]): number | undefined;
export declare function addVectorDimensionDiagnostics(dimension: number, diagnostics: ConfigDiagnosticLike[]): void;
export declare function vectorDimensionWarningMessage(dimension: number): string;
export declare function estimateVectorBytes(dimension: number, count?: number): number;
//# sourceMappingURL=VectorDimension.d.ts.map
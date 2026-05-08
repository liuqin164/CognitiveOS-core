export interface DeepWriteRedactionResult<T> {
    value: T;
    redactionCount: number;
}
export interface CustomRedactor {
    redact(input: unknown): {
        value: unknown;
        redactionCount: number;
    };
}
export declare class DeepWriteRedactor {
    redact<T>(input: T): DeepWriteRedactionResult<T>;
}
//# sourceMappingURL=DeepWriteRedactor.d.ts.map
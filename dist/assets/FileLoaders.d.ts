import type { FileLoadInput, FileLoadProbe, FileLoader, LoadedFile } from './types.js';
export declare class PlainTextLoader implements FileLoader {
    id: string;
    canLoad(input: FileLoadProbe): boolean;
    load(input: FileLoadInput): Promise<LoadedFile>;
}
export declare class HtmlLoader implements FileLoader {
    id: string;
    canLoad(input: FileLoadProbe): boolean;
    load(input: FileLoadInput): Promise<LoadedFile>;
}
export declare class CsvLoader implements FileLoader {
    id: string;
    canLoad(input: FileLoadProbe): boolean;
    load(input: FileLoadInput): Promise<LoadedFile>;
}
export declare class CodeTextLoader implements FileLoader {
    id: string;
    canLoad(input: FileLoadProbe): boolean;
    load(input: FileLoadInput): Promise<LoadedFile>;
}
export declare class DocxLoader implements FileLoader {
    id: string;
    canLoad(input: FileLoadProbe): boolean;
    load(input: FileLoadInput): Promise<LoadedFile>;
}
export declare class XlsxLoader implements FileLoader {
    id: string;
    canLoad(input: FileLoadProbe): boolean;
    load(input: FileLoadInput): Promise<LoadedFile>;
}
export declare class PdfLoader implements FileLoader {
    id: string;
    canLoad(input: FileLoadProbe): boolean;
    load(input: FileLoadInput): Promise<LoadedFile>;
}
//# sourceMappingURL=FileLoaders.d.ts.map
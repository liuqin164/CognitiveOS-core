import type { FileLoadProbe, FileLoader } from './types.js';
export declare class FileLoaderRegistry {
    private readonly loaders;
    constructor(loaders?: FileLoader[]);
    resolve(input: FileLoadProbe): FileLoader | null;
    list(): FileLoader[];
}
//# sourceMappingURL=FileLoaderRegistry.d.ts.map
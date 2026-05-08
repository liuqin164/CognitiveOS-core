import { CodeTextLoader, CsvLoader, DocxLoader, HtmlLoader, PdfLoader, PlainTextLoader, XlsxLoader } from './FileLoaders.js';
export class FileLoaderRegistry {
    loaders;
    constructor(loaders) {
        this.loaders = loaders || [
            new CsvLoader(),
            new HtmlLoader(),
            new PdfLoader(),
            new DocxLoader(),
            new XlsxLoader(),
            new CodeTextLoader(),
            new PlainTextLoader()
        ];
    }
    resolve(input) {
        return this.loaders.find((loader) => loader.canLoad(input)) || null;
    }
    list() {
        return [...this.loaders];
    }
}

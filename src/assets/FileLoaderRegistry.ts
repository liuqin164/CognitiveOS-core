import type { FileLoadProbe, FileLoader } from './types.js';
import { CodeTextLoader, CsvLoader, DocxLoader, HtmlLoader, PdfLoader, PlainTextLoader, XlsxLoader } from './FileLoaders.js';

export class FileLoaderRegistry {
  private readonly loaders: FileLoader[];

  constructor(loaders?: FileLoader[]) {
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

  resolve(input: FileLoadProbe): FileLoader | null {
    return this.loaders.find((loader) => loader.canLoad(input)) || null;
  }

  list(): FileLoader[] {
    return [...this.loaders];
  }
}

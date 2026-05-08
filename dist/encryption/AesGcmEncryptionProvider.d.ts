import type { EncryptionProvider } from './EncryptionProvider.js';
export declare class AesGcmEncryptionProvider implements EncryptionProvider {
    private readonly key;
    constructor(key: Buffer);
    static fromPassphrase(passphrase: string): AesGcmEncryptionProvider;
    encrypt(plaintext: string): string;
    decrypt(ciphertext: string): string;
}
//# sourceMappingURL=AesGcmEncryptionProvider.d.ts.map
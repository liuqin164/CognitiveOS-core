export interface EncryptionProvider {
    encrypt(plaintext: string): string;
    decrypt(ciphertext: string): string;
}
export declare function isEncryptedPayload(value: string): boolean;
//# sourceMappingURL=EncryptionProvider.d.ts.map
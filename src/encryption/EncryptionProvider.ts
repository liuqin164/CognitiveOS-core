export interface EncryptionProvider {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}

export function isEncryptedPayload(value: string): boolean {
  return value.startsWith('enc:v1:');
}

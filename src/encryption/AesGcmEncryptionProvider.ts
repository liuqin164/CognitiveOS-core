import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { EncryptionProvider } from './EncryptionProvider.js';
import { isEncryptedPayload } from './EncryptionProvider.js';

export class AesGcmEncryptionProvider implements EncryptionProvider {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error(`AES-GCM key must be 32 bytes, got ${key.length}`);
    }
  }

  static fromPassphrase(passphrase: string): AesGcmEncryptionProvider {
    return new AesGcmEncryptionProvider(createHash('sha256').update(passphrase).digest());
  }

  encrypt(plaintext: string): string {
    if (isEncryptedPayload(plaintext)) return plaintext;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      'enc:v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    if (!isEncryptedPayload(ciphertext)) return ciphertext;
    const [, version, ivRaw, tagRaw, encryptedRaw] = ciphertext.split(':');
    if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
      throw new Error('Unsupported encrypted payload format');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}

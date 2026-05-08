export function isEncryptedPayload(value) {
    return value.startsWith('enc:v1:');
}

# Security

`@CognitiveOS/core` is local-first by default. Memory data is stored in the configured SQLite database path.

## Data Handling

- Core does not require a hosted storage service.
- Embedding providers may send text to the provider you configure.
- PII redaction can be enabled with `COGMEM_PII_REDACT_EMAIL`, `COGMEM_PII_REDACT_PHONE`, and `COGMEM_PII_REDACT_SSN`.
- Field encryption is available by passing an `EncryptionProvider` when creating the kernel.
- Snapshot files should be treated as sensitive because they contain exported memory data.

## Reporting

Report vulnerabilities privately through the repository security advisory flow. Do not open public issues for exploitable security bugs.

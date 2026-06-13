# Contributing

## Setup

```bash
bun install
bun run typecheck
bun test
```

## Pull Request Gate

Before opening a pull request that changes core, run:

```bash
bun run build
bun run typecheck
bun test
npm pack --dry-run --json
```

`cogmem` is distributed from GitHub Releases. Use `npm pack --dry-run --json` to verify package contents and upload the resulting release asset through GitHub. Do not publish this release channel to npm.

## API Discipline

Only explicitly exported symbols in `src/public.ts` are public. Do not re-export `src/internal.ts` from the package entrypoint.

## Adapter Changes

Agent-specific adapters must keep core independent from host runtimes. Prefer a narrow workspace profile plus fixture-backed tests over importing another runtime.

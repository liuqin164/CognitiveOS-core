# Hermes Agent Memory Backend Runbook

You are configuring Hermes to use `@CognitiveOS/core` as its durable memory backend.

## Install

Run from the Hermes workspace root:

```bash
bun add @CognitiveOS/core
bunx cogmem-init --agent hermes
bunx cogmem-doctor
```

The default install creates:

```text
~/.cogmem/config.toml
~/.cogmem/memory.db
~/.cogmem/snapshots/
```

Use `bunx cogmem-init --agent hermes --scope project` only when this workspace needs its own `.cogmem/` directory.

If you configure a high-dimensional embedding model, set `core.vector_dimension` in `~/.cogmem/config.toml` to the model output dimension. Example: `qwen3-embedding:8b` needs `vector_dimension = 4096`. Run `bunx cogmem-doctor` after editing; it warns about 2048+ dimensions because 4096-dimensional vectors cost about 1.53 GiB per 100,000 memories before SQLite/index overhead.

## Migrate Existing Hermes Memory

Default Hermes memory contract:

- `profile.md` contains durable profile/persona memory.
- `sessions/**/*.md` contains conversation/session memory.

Preview first:

```bash
bunx cogmem-import-hermes --workspace . --project hermes --dry-run
```

Then migrate:

```bash
bunx cogmem-import-hermes --workspace . --project hermes
```

Use `--json` when another agent needs structured output:

```bash
bunx cogmem-import-hermes --workspace . --project hermes --json
```

If Hermes stores memory somewhere else, pass explicit paths:

```bash
bunx cogmem-import-hermes --workspace . --project hermes --profile ./memory/profile.md --sessions ./memory/sessions
```

## Runtime Wiring

Use `KernelAgentMemoryBackend` for turn storage and recall:

```ts
import {
  KernelAgentMemoryBackend,
  createMemoryKernelFromConfig,
} from '@CognitiveOS/core';

const kernel = createMemoryKernelFromConfig();
const memory = new KernelAgentMemoryBackend(kernel);

await memory.rememberTurn({
  agentId: 'hermes',
  projectId: 'hermes',
  sessionId: 'current',
  userText,
  assistantText,
});

const recall = memory.recall({
  agentId: 'hermes',
  projectId: 'hermes',
  query: userText,
});

const preparedContext = {
  mode: recall.recallMode,
  narrative: recall.narrative,
  pulseTrace: recall.pulseTrace,
  temporalLabels: recall.temporalTraversal?.labels,
  memories: recall.items,
};
```

Recall behavior:

- `recall.recallMode === 'universe_navigation'` means core already ran pulse activation, temporal branch search, graph traversal, and narrative assembly.
- Use `recall.narrative` as the compact context summary for the next model prompt.
- Use `recall.items` as cited memory evidence.
- Use `recall.temporalTraversal?.labels` when the user refers to a day, session, or adjacent work period.
- Do not run a separate vector search before calling `memory.recall()`. The backend is the first-class memory retrieval path.

The migration command is idempotent. Re-running it skips records already imported into the same memory database.

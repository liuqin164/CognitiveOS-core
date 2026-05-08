# OpenClaw Agent Memory Backend Runbook

You are configuring OpenClaw to use `@CognitiveOS/core` as its durable memory backend.

## Install

Run from the OpenClaw workspace root:

```bash
bun add @CognitiveOS/core
bunx cogmem-init --agent openclaw
bunx cogmem-doctor
```

The default install creates:

```text
~/.cogmem/config.toml
~/.cogmem/memory.db
~/.cogmem/snapshots/
```

Use `bunx cogmem-init --agent openclaw --scope project` only when this workspace needs its own `.cogmem/` directory.

## Migrate Existing OpenClaw Memory

Preview first:

```bash
bunx cogmem-import-openclaw --workspace . --project openclaw --dry-run
```

Then migrate:

```bash
bunx cogmem-import-openclaw --workspace . --project openclaw
```

Use `--json` when another agent needs structured output:

```bash
bunx cogmem-import-openclaw --workspace . --project openclaw --json
```

Import scope:

- Import `USER.md` as user profile memory.
- Import `SOUL.md`, `PERSONA.md`, and `IDENTITY.md` as persona/profile memory.
- Import `MEMORY.md` as imported summary/index memory.
- Import `memory/YYYY-MM-DD.md` as daily episodic memory.
- Import `sessions/*.md`, `session-logs/*.md`, `session_logs/*.md`, `conversations/*.md`, `exports/sessions/*.md`, and `exports/conversations/*.md` as session memory.
- Do not import AGENTS.md, TOOLS.md, HEARTBEAT.md, or BOOTSTRAP.md. They are operational instructions, not durable user memory.

Useful options:

```bash
bunx cogmem-import-openclaw --workspace . --project openclaw --date 2026-05-07
bunx cogmem-import-openclaw --workspace . --project openclaw --session ./custom-session.md
bunx cogmem-import-openclaw --workspace . --project openclaw --memory ./custom-memory.md
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
  agentId: 'openclaw',
  projectId: 'openclaw',
  sessionId: 'current',
  userText,
  assistantText,
});

const recall = memory.recall({
  agentId: 'openclaw',
  projectId: 'openclaw',
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

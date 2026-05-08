# OpenClaw Backend

Use core as OpenClaw's durable memory backend without installing CognitiveOS.

## Install

```bash
bun add @CognitiveOS/core
bunx cogmem-init --agent openclaw
bunx cogmem-doctor
```

## Migrate

Preview:

```bash
bunx cogmem-import-openclaw --workspace . --project openclaw --dry-run
```

Import:

```bash
bunx cogmem-import-openclaw --workspace . --project openclaw
```

The import command is idempotent. Re-running it against the same database skips records already processed by the cursor store.

## Runtime

```ts
import {
  KernelAgentMemoryBackend,
  OpenClawWorkspaceProfile,
  createMemoryKernelFromConfig,
} from '@CognitiveOS/core';

const kernel = createMemoryKernelFromConfig();
const memory = new KernelAgentMemoryBackend(kernel);
const profile = new OpenClawWorkspaceProfile(process.cwd());

const sources = profile.buildInstalledBatchSources({ projectId: 'openclaw' });
console.log(sources);

await memory.rememberTurn({
  agentId: 'openclaw',
  projectId: 'openclaw',
  sessionId: 'current',
  userText: 'Remember that public release uses sqlite-vec.',
  assistantText: 'Stored.',
});

const recalled = memory.recall({
  agentId: 'openclaw',
  projectId: 'openclaw',
  query: 'which vector backend should release use?',
});

console.log(recalled.items);
```

The profile imports memory sources only. It ignores operational files such as `AGENTS.md`, `TOOLS.md`, `HEARTBEAT.md`, and `BOOTSTRAP.md` by default.

For an agent-facing installation and migration runbook, see `AGENTS.md`.

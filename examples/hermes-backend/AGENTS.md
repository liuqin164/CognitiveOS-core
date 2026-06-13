# Hermes Agent Memory Backend Runbook

You are configuring Hermes to use `cogmem` as its durable memory backend.

For a portable one-file skill, read `SKILL.md` or install it into the workspace with:

```bash
cogmem connect hermes --workspace .
```

This writes `~/.hermes/skills/cogmem-memory/SKILL.md`, which Hermes discovers as a local skill.

## Install

Run from the Hermes workspace root:

```bash
COGMEM_SKIP_INIT=1 curl -fsSL https://raw.githubusercontent.com/liuqin164/cogmem/main/install.sh | bash
cogmem init --yes --agent hermes
cogmem doctor --fix --agent hermes --workspace .
cogmem connect hermes --workspace . --auto
cogmem connect hermes --workspace .
```

The default install creates:

```text
~/.cogmem/config.toml
~/.cogmem/memory.db
~/.cogmem/snapshots/
```

Use `~/.cogmem/config.toml` or a project `.cogmem/config.toml` as the stable configuration source. Do not create `.cogmem.env` files or pass `--env-path` for normal installs. Environment variables are only for explicit process-level overrides documented by the CLI, not for hidden workspace configuration.

Use `cogmem init --yes --agent hermes --scope project` only when this workspace needs its own `.cogmem/` directory.

To embed imported memories with a local quantized model, run Ollama locally and configure the kernel before importing:

```bash
ollama pull qwen3-embedding:0.6b
```

```toml
[core]
vector_dimension = 1024

[embedding]
provider = "openai_compatible"
base_url = "http://localhost:11434/v1"
model = "qwen3-embedding:0.6b"
```

Use the matching dimension for larger local models: `qwen3-embedding:4b` uses `2560`; `qwen3-embedding:8b` uses `4096`. Run `cogmem doctor` after editing. Imported records are embedded through the configured kernel embedder during `cogmem import-hermes`.

## Migrate Existing Hermes Memory

Default Hermes memory contract:

- `profile.md` contains durable profile/persona memory.
- `sessions/**/*.md` contains conversation/session memory.

Preview first:

```bash
cogmem import-hermes --workspace . --project hermes --dry-run
```

Then migrate:

```bash
cogmem import-hermes --workspace . --project hermes
```

Use `--json` when another agent needs structured output:

```bash
cogmem import-hermes --workspace . --project hermes --json
```

If Hermes stores memory somewhere else, pass explicit paths:

```bash
cogmem import-hermes --workspace . --project hermes --profile ./memory/profile.md --sessions ./memory/sessions
cogmem import-hermes --workspace . --project hermes --session ./one.md
cogmem import-hermes --workspace . --project hermes --session ./one.md --session ./two.md
```

## Runtime Wiring

Use `KernelAgentMemoryBackend` for turn storage and recall:

```ts
import {
  KernelAgentMemoryBackend,
  createMemoryKernelFromConfig,
} from 'cogmem';

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

Hermes integration is currently a skill plus MCP bridge. It does not replace a native Hermes memory provider and it does not patch Hermes runtime internals. `cogmem connect hermes --workspace . --auto` writes or updates the `mcp_servers.cogmem` entry in the Hermes config. Restart or reload Hermes after patching MCP config.

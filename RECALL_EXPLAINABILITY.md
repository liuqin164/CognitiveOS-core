# Recall Explainability

Agent-facing recall is governed by default. `KernelAgentMemoryBackend.recall()` and `MemoryKernel.navigateMemory()` return active evidence only after scope, status, trust, and budget filtering.

## Included Evidence

`explainRecallWithKernel()` reports why evidence entered the recall result:

- `activationPath`: the recall path, such as pulse, temporal traversal, or fallback.
- `whyMatched`: agent scope, provenance, pulse fusion, temporal branch, and governance reasons.
- `sourceAnchor`: the drill-down anchor for the semantic memory source event.

`sourceAnchor` contains:

- `eventId`: the memory event that recorded the semantic ingest.
- `sourceEventType`: usually `INGESTED`.
- `sourceRefs`: raw event, source path, thread, line, turn, and ordinal anchors when available.
- `context`: surrounding ledger context for the source event.

For agent lifecycle events, source refs may point to `message`, `tool_call`, `tool_result`, or `task_event` raw ledger entries. For normalized JSON/CSV imports, source refs preserve original source offset and row/line anchors when available, even though ingestion flows through Markdown projection.

## Filtered Evidence

`filteredEvidence` records same-project candidates that were considered but did not enter active context. Reasons include:

- `status_suppressed`
- `over_context_limit`
- `agent_scope_mismatch`

When available, filtered evidence also carries `sourceAnchor` so forensic tools can explain where a suppressed candidate came from. Scoped explain results must stay same-project; cross-project filtered evidence must not be exposed.

## Ledger Vs Recall

Use chronological ledger APIs when the question is about original order:

- `getThreadEvents(threadId)`
- `getEventContext(eventId, { before, after })`

Use governed recall when the agent needs current task context:

- `KernelAgentMemoryBackend.recall()`
- `MemoryKernel.navigateMemory()`
- `explainRecallWithKernel()`

Ledger replay can show raw evidence. It must not replace governed recall, pulse activation, inhibition, or ContextPack budgeting.

# Memory Model

`@CognitiveOS/core` is an agent-native memory kernel. It stores agent experience, compiles durable memory at write time, recalls with structure-first pulse navigation, and keeps active context governed and bounded.

It is not a vector RAG store, a knowledge-base application, a wiki, an Obsidian replacement, or an agent runtime.

## Memory Tiers

- Raw Archive: append-only raw experience events such as user messages, assistant messages, tool observations, task events, imports, and corrections.
- Chronological Memory Ledger: the ordered event ledger used for audit, replay, source anchoring, and migration consistency.
- Compiled Memory: write-time facts, beliefs, events, summaries, graph links, and governance state derived from raw evidence.
- Active Core: a very small current operating context maintained by the host agent or adapter, not all history.
- Associative Graph: pulse-activated local graph, topic, entity, temporal, and cognitive adjacency candidates.
- Recall Pack / ContextPack: the limited governed context returned for the current agent task.
- Filtered Evidence: same-project candidates that were considered but suppressed by status, trust, scope, or budget.

## Chronological Memory Ledger

The ledger answers chronological questions:

- Which event came first globally?
- Which event came next in a thread?
- Which user message triggered which assistant reply?
- Which tool result belongs to which tool call?
- Which raw event anchored a semantic memory?

The ledger uses optional, backward-compatible fields:

- `globalSeq`, `eventId`, `createdAt`, `ingestedAt`, `sourceId`, `contentHash`
- `threadId`, `sessionId`, `threadSeq`, `localDate`, `projectId`, `workspaceId`
- `turnId`, `turnSeq`, `eventOrdinal`, `role`, `sourceOffset`, `lineStart`, `lineEnd`, `charStart`, `charEnd`
- `parentEventId`, `prevEventId`, `nextEventId`, `causalityType`
- `rawEventType`, `orderingConfidence`

Use `MemoryKernel.getThreadEvents(threadId)` for replay and `MemoryKernel.getEventContext(eventId, { before, after })` for source drill-down.

Provider facades record raw lifecycle events without importing host runtimes:

- `recordRawEvent()` / `KernelAgentMemoryBackend.rememberTurn()` record user and assistant messages.
- `recordToolCall()` / `KernelAgentMemoryBackend.ingestToolCall()` record assistant tool calls with `rawEventType: "tool_call"`.
- `recordToolResult()` / `KernelAgentMemoryBackend.ingestToolObservation()` record tool results with `rawEventType: "tool_result"` and `causalityType: "tool_result_for"`.
- `recordTaskEvent()` / `KernelAgentMemoryBackend.ingestTaskEvent()` record task events with source refs.

Tool observations are stored as external-tool evidence candidates. They are not promoted into verified facts merely because they were observed or later recalled.

## Recall Ranking

chronological order is not recall ranking.

Chronological order is for replay and audit. Recall ranking is for selecting useful current context. Agent-facing recall still uses governed universe navigation: query compilation, pulse activation, temporal traversal, graph expansion, inhibition, and evidence budgeting.

Do not use vector topK to reconstruct conversation order. Do not use ledger replay to bypass governed recall. Do not inject an entire thread, day, or transcript into prompt context unless a forensic/audit tool explicitly requests replay.

## SourceRefs

Semantic memories remain traceable through `sourceRefs`. A source ref may point to:

- a raw ledger event id
- a thread/session/turn position
- a source path
- line or character offsets
- parent/previous event links
- ordering confidence

Imported Markdown records preserve line order and block ordinal when available. Normalized JSON array, JSONL, CSV, and TSV transcript imports emit per-message source anchors before Markdown ingestion so `sourceRefs` can preserve original array index, row line, or block ordinal instead of only the normalized Markdown line. If a source lacks reliable ordering, adapters should set `orderingConfidence: "low"` rather than inventing certainty.

## External Mechanisms

Compatible mechanisms translated into the kernel model:

- Temporal fact invalidation: represented by current fact and belief validity fields such as `validFrom`, `validTo`, supersession links, status, and evidence refs.
- Memory tier names: used as documentation and API explanation only.
- Provider lifecycle: routed through `KernelAgentMemoryBackend` and narrow adapters, never through host runtime imports.
- Behavior memory: stored as candidate/provisional governed memory with source refs and confidence, not as automatically verified fact.
- Benchmark ideas: expressed as natural-emergence metrics that test recall and inhibition together.

Rejected designs:

- default vector topK as the primary recall path
- LLM-controlled free memory mutation
- provider context directly injected into prompts
- Markdown projection as source of truth
- unbounded graph traversal
- fixed recent-six-turn context as the memory model

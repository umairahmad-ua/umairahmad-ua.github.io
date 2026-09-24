---
title: "Session memory for agents: what to store and what to forget"
description: "Agents need memory to be useful and forgetting to be safe. How my team designs session state, summaries, and retention for enterprise agents on Google Cloud."
pubDatetime: 2025-10-15T15:00:00Z
kind: article
tags: ["agents", "adk", "gcp", "security"]
sources:
  - title: "Google Cloud launches Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
diagram:
  caption: "Three memory layers with different lifetimes, from turn context to typed session state to user approved long term memory."
  nodes:
    - { id: "user", label: "User turns", col: 0, kind: "source" }
    - { id: "redact", label: "Redaction layer", col: 1, kind: "tool" }
    - { id: "ctx", label: "Turn context, verbatim", col: 1, kind: "store" }
    - { id: "summ", label: "Small model rolling summary", col: 2, kind: "model" }
    - { id: "state", label: "SessionState typed object", col: 2, kind: "store" }
    - { id: "fs", label: "Agent Engine session store", col: 3, kind: "store" }
    - { id: "propose", label: "Agent proposes a memory", col: 3, kind: "agent" }
    - { id: "approve", label: "User approves or deletes", col: 4, kind: "human" }
    - { id: "ltm", label: "Long term memory per user", col: 5, kind: "store" }
  edges:
    - ["user", "ctx"]
    - ["user", "redact", "identifiers"]
    - ["redact", "fs", "stable tokens"]
    - ["ctx", "summ", "every five turns"]
    - ["summ", "ctx", "replaces old turns"]
    - ["ctx", "state", "extracted facts"]
    - ["state", "fs", "expires with session"]
    - ["state", "propose"]
    - ["propose", "approve", "default to EMEA?"]
    - ["approve", "ltm", "only a yes writes"]
---

## Table of contents

## The two complaints

Users of a new agent complain about memory in two opposite ways within the first week. It forgot what I said three messages ago. It remembered something I told it last month and I did not expect that.

Both are design failures. The first is a context problem. The second is a policy problem. My team has now built session memory for a marketing intelligence agent, a supply chain planner, and a healthcare reviewer's assistant. The patterns are the same across all three. This is what we settled on.

## Three layers, three lifetimes

We split memory into three layers with different lifetimes and different storage.

**Turn context.** The last several messages, verbatim. Lives in the model's context window for the duration of a session. Gone when the session ends. This is what most people mean by memory and it is the least interesting layer.

**Session state.** Structured facts extracted during the session. The user's role, the client account in scope, the date range they asked about, the filters they applied, the decisions they made. Stored as a typed object, not as text. Lives in Vertex AI Agent Engine's session store, backed by Firestore for our own reads. Expires with the session or after a fixed idle window.

**Long-term memory.** Facts about the user that should survive sessions. Preferred report format, the product lines they own, that they want numbers in euros. Stored per user, reviewed by the user, deletable by the user. Small by design.

```python
class SessionState(BaseModel):
    user_role: Literal["analyst", "planner", "reviewer"]
    account_scope: list[str]
    active_date_range: DateRange | None
    filters: dict[str, str]
    decisions: list[Decision]           # what the user approved or rejected
    summary: str                        # rolling summary of the conversation
    updated_at: datetime
```

The summary field is the bridge between layers. Every few turns a small model rewrites the summary from the previous summary plus the new turns. The summary replaces old turns in the context window. The state object holds the facts we would not trust a summary to preserve.

## What goes into long-term memory

Nothing goes in automatically. That is the rule that resolved the second complaint.

An agent may propose a memory. "You have asked for EMEA three sessions in a row. Should I default to EMEA?" The user says yes or no. Only a yes writes. The user can see the full list of stored memories and delete any of them. For the healthcare client, long-term memory is disabled entirely. A reviewer's preferences are not worth the retention question.

This is slower than silent learning. It is also the only version a compliance team accepted.

## Retention is a policy, not a setting

For regulated clients the session store holds redacted content only. Names and identifiers arrive as stable tokens from our redaction layer. The token mapping lives elsewhere with its own expiry. So the session store can keep a conversation for thirty days for debugging without holding any identifier.

Retention windows are per client and per layer:

| Layer | Marketing client | Healthcare client |
|---|---|---|
| Turn context | Session | Session |
| Session state | 30 days | 7 days |
| Long-term memory | Until deleted | Disabled |
| Traces | 90 days | 30 days, redacted |

These numbers came out of the client's data retention policy, not out of our preferences. The agent's memory has to fit the company's existing rules, not the other way around.

## Memory is a source of bugs

The hardest bugs we have hit in agents this year were memory bugs, not model bugs.

A planner agent kept applying a filter the user had removed two turns earlier. The summary had preserved "user is looking at Jordan plant" and the state object had not been updated when the filter was cleared. Fix: the state object is the only source of truth for filters, and the summary is regenerated from state plus turns, never the other way around.

A marketing agent answered a question about one client account with data from another. Two sessions from the same user, both open, both writing to the same state key. Fix: state keyed by session, not by user, and account scope checked on every tool call, not just at session start.

Both bugs were invisible in the eval suite because the suite ran single-turn cases. We now have multi-turn eval scenarios that set state, change it, and check the agent honors the change.

## Evaluating memory

Memory evals are scripted conversations with assertions at each turn.

```yaml
scenario: filter_removed
turns:
  - user: "Show me capacity for the Jordan plant next month"
    expect_state: {filters: {plant: "Jordan"}}
  - user: "Actually, all plants"
    expect_state: {filters: {}}
  - user: "Which one is most constrained?"
    expect_tool_call:
      name: capacity_query
      args_not_contain: {plant: "Jordan"}
```

We have about forty scenarios per agent. They run in CI with every prompt or tool change. They catch the class of bug that a single-turn suite never sees.

## Cost of memory

Memory is not free in tokens. A rolling summary plus a state object costs less than replaying the full transcript, but the summarization calls add up on long sessions. We measured a planning session with sixty turns. Replaying the full transcript at each turn would have cost about four times what the summary approach cost. The summary approach also kept the context window small enough that the model's attention stayed on the current question. Longer context did not help. It hurt.

We summarize every five turns and cap the summary at a fixed token budget. When the cap is hit the oldest facts in the summary are dropped, but only if they are already captured in the state object. The state object never drops anything during a session. That is the point of having it.

## Memory across agents

In a multi-agent system the question becomes which agent owns which memory. In Scout, the root agent owns the session state and passes a read-only view to sub-agents. A sub-agent may propose a state change by returning it in its structured output. The root agent applies it or rejects it. No sub-agent writes to the store directly. This felt bureaucratic when we designed it. It has prevented every category of race condition we had seen before.

## Where the platform helps

Agent Engine's session and memory services took a real chunk of infrastructure off our plate. Sessions, per-user memory, and the plumbing between them are managed. Google's launch of [Gemini Enterprise](https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise) last week signals more of this. Memory and identity across agents are becoming platform features. I welcome that. The policy decisions stay ours.

## The principle

Store facts as facts, in typed objects. Summarize conversation, never state. Let users approve anything that outlives a session. Set retention from the client's policy. Test memory with multi-turn scenarios.

An agent that remembers everything is a liability. An agent that remembers the right things, and can show you the list, is a colleague.

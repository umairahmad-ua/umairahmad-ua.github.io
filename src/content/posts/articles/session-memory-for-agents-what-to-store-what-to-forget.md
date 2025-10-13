---
title: "Session memory for agents: what to store and what to forget"
description: "Agents need memory to be useful and forgetting to be safe. How my team designs session state, summaries, and retention for enterprise agents on Google Cloud."
pubDatetime: 2025-10-15T15:00:00Z
kind: article
theme: structure
tags: ["agents", "adk", "gcp", "security"]
sources:
  - title: "Google Cloud launches Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
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


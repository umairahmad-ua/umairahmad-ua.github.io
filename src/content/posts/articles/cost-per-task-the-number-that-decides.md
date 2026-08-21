---
title: "Cost per task: the number that decides if an agent survives"
description: "Success rate without cost is a vanity metric. How my team traces the cost of every completed agent task and lets that number shape the architecture."
pubDatetime: 2026-08-23T15:00:00Z
kind: article
theme: evals
featured: true
tags: ["agents", "evals", "infra"]
sources:
  - title: "Anthropic: introducing Claude Sonnet 5"
    url: "https://www.anthropic.com/news/claude-sonnet-5"
    date: 2026-06-30
  - title: "Claude Code: what's new, week 30 2026 (Claude Opus 5)"
    url: "https://code.claude.com/docs/en/whats-new/2026-w30"
    date: 2026-07-24
  - title: "New AI model releases and news, August 2026 (GPT-5.6 Luna price cut)"
    url: "https://blog.mean.ceo/new-ai-model-releases-news-august-2026/"
    date: 2026-07-30
  - title: "Anthropic: auto mode is now the default in Claude Code"
    url: "https://claude.com/blog/auto-mode-default-in-claude-code"
    date: 2026-08-14
---

## Table of contents

## The agent that worked and got switched off

Early this year a client of ours ran a document agent for about six weeks and then turned it off. It did the job. It extracted what they asked for, with an accuracy the reviewers were happy with. It was turned off because the finance team looked at the invoice and compared it to the cost of the two people who used to do the work.

The agent lost. Not on quality. On cost per completed task.

I have told that story to every engineer on my team since. Success rate is what you demo. Cost per task is what you survive on.

## What we count

At Zazmic we trace the cost of every task an agent completes, per agent, per step. A task is a unit the business recognizes: one claim processed, one migration batch validated, one planning run, one support ticket resolved. Not one model call.

Each task produces a trace with the following:

- Model tokens in and out, per call, with the model name and price at the time of the call.
- Tool calls, with duration and any downstream cost (a BigQuery scan, a search query).
- Retries, counted separately, because a retry is a cost you chose.
- Human review time, when a human touched the task, in minutes, priced at a loaded rate the client gives us.
- Outcome: completed, escalated, abandoned.

Here is a trimmed example record. The numbers are illustrative, not from a client.

```json
{
  "task_id": "mig-batch-2026-08-19-0042",
  "agent": "migration.validate",
  "outcome": "completed",
  "steps": [
    {
      "kind": "model",
      "model": "gemini-3.1-flash",
      "tokens_in": 18400,
      "tokens_out": 1200,
      "usd": 0.0071
    },
    {
      "kind": "tool",
      "name": "bigquery.query",
      "bytes_scanned": 2147483648,
      "duration_ms": 3900,
      "usd": 0.0125
    },
    {
      "kind": "model",
      "model": "claude-sonnet-5",
      "tokens_in": 9200,
      "tokens_out": 640,
      "usd": 0.0248,
      "retry_of": null
    },
    {
      "kind": "human",
      "role": "data_engineer",
      "minutes": 4,
      "usd": 6.00
    }
  ],
  "usd_total": 6.0444,
  "usd_machine": 0.0444,
  "usd_human": 6.00
}
```

Two things stand out in that example, and they stand out in real traces too. The machine cost is small. The human cost is almost everything. When someone says "the agent is expensive," the first question is which line they are looking at.

## Aggregation is where it gets useful

A single trace is a receipt. The aggregate is the metric.

We roll traces up nightly into a table with one row per agent per day: tasks attempted, tasks completed, machine cost, human cost, and the two numbers I actually watch.

```sql
SELECT
  agent,
  DATE(ended_at) AS day,
  COUNTIF(outcome = 'completed') AS completed,
  COUNT(*) AS attempted,
  SUM(usd_machine) AS usd_machine,
  SUM(usd_human) AS usd_human,
  SAFE_DIVIDE(SUM(usd_machine + usd_human),
              COUNTIF(outcome = 'completed')) AS usd_per_completed_task,
  SAFE_DIVIDE(SUM(usd_machine + usd_human),
              COUNT(*)) AS usd_per_attempt
FROM agent_task_traces
GROUP BY agent, day
```

Cost per completed task is the survival number. Cost per attempt is the diagnostic. When the two diverge, the agent is spending money on tasks it then abandons or escalates, and that is where to look first.

We put that table in front of the client from the first week of any engagement. Not because they ask for it. Because if they see it early, the conversation about whether the agent is worth running happens while we can still change the design.

## Cost is an architecture input

Once the number is visible, it starts making decisions for you.

**Route by step, not by agent.** Every task has steps that need a strong model and steps that do not. Classifying an incoming document is cheap work. Reconciling two schemas is not. We assign a model per step and let the trace tell us when a cheap step is failing often enough to justify a stronger model. Most steps stay cheap.

**Cache what repeats.** In the migration agents, the same source schema description goes into hundreds of calls. Prompt caching turned that from a per-call cost into a near-zero one. It also made the traces easier to read, because the cached prefix shows up as its own line.

**Stop early.** An agent that retries three times and then escalates has spent four attempts of machine cost plus a human's time. We set retry budgets per step from the trace data. If a step's second attempt rarely succeeds where the first failed, the budget is one.

**Move the human earlier.** Human review at the end of a failed task is the most expensive possible place for it. When a task type escalates often, we look for the earliest signal in the trace that predicts escalation, and we ask the human then. Four minutes at step two beats fifteen minutes at step nine.


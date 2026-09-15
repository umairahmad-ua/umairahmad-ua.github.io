---
title: "Approval in Slack: how our ops agent asks permission"
description: "The cloud operations agent proposes an action in Slack with evidence, a human approves or rejects, and the agent executes only inside its playbook. How the approval loop is built."
pubDatetime: 2026-09-16T15:00:00Z
kind: article
theme: tools
tags: ["agents", "security", "claude"]
sources:
  - title: "Google Gemini 3.8 Live in the Gemini API"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
    date: 2026-09-15
  - title: "Cowork is now Claude"
    url: "https://claude.com/blog/cowork-is-now-claude"
    date: 2026-09-16
---

## Table of contents

## The message at 2:14 in the morning

At 2:14 on a Tuesday morning in August, a Slack channel for one of our clients received a message from a bot. It said that a Cloud Run service had been returning errors for six minutes, that the error rate was 31 percent, that the last deploy was fourteen hours earlier, and that the agent proposed rolling back to the previous revision. It attached the error log excerpt and the deploy diff. It asked for approval and said it would escalate to the on-call phone if nobody answered in ten minutes.

The on-call engineer tapped approve from bed. The rollback took forty seconds. The agent posted the new error rate three minutes later, which was zero, and closed the thread.

That message is the product. Everything else in the ops agent exists to make that message trustworthy. This piece is about how the approval loop works, because the loop is where most of the design went.

## Why approval and not autonomy

The agent could have rolled back on its own. The playbook said so, the confidence was high, and the action was reversible. We still asked.

The reason is not caution for its own sake. It is that the client's trust in the agent was built one approved message at a time. Every approval is a human looking at the evidence and agreeing. After three months of agreements, the client asked us to let the agent roll back on its own for that one playbook. We did. That is the right order. Autonomy granted after a record, not assumed before one.

The second reason is that the approval message is also the audit record. A human who approved can explain the decision later. An agent that acted alone leaves a log line that nobody remembers reading.

## The loop, step by step

The agent runs on the Claude Agent SDK with a small set of tools exposed over MCP. Here is what happens between an alert and an action.

1. **An alert arrives.** Cloud Monitoring fires a webhook into a Pub/Sub topic. The agent picks it up with the alert payload and nothing else.
2. **The agent gathers evidence.** It calls read-only tools. Logs for the service in the last fifteen minutes. The deploy history. The current error rate and latency. These tools cannot change anything, so the agent can call them freely.
3. **The agent matches a playbook.** Playbooks live in a repository as markdown with a YAML header. The header names the conditions, the allowed actions and the approval policy. The agent picks the playbook whose conditions match and quotes it in the message.
4. **The agent proposes.** It posts to Slack with four parts. What it observed, with numbers. What it thinks is happening. What it proposes to do, named exactly as the playbook names it. What it will do if nobody answers.
5. **A human decides.** Approve or reject are buttons. Both record who clicked and when. A reject can carry a reason, and the reason goes into the agent's context for the rest of the incident.
6. **The agent executes.** Only the action named in the proposal. Only through a tool whose service account is scoped to that playbook. If the execution tool returns anything unexpected, the agent stops and posts again.
7. **The agent reports.** The metric it was watching, before and after. Then it closes the thread.

Every step writes a row to a BigQuery audit table. The row has the alert id, the playbook, the evidence hashes, the proposal text, the approver, the timestamps and the outcome.

## The message format is the interface

We iterated on the Slack message more than on any prompt. The first version was a paragraph. Engineers skimmed it and approved. That is the failure mode. An approval that nobody read is worse than no approval, because it looks like oversight and is not.

The version that works has a fixed shape:

```
Service: orders-api (prod, us-central1)
Observed: 5xx rate 31% for 6 min (threshold 5%). p95 latency 2.8s.
Last change: deploy rev 00147 at 12:03 (14h ago). Diff: 3 files.
Playbook: cloud-run-rollback v4
Proposed: roll back to rev 00146
If no answer in 10 min: page on-call
[Approve] [Reject]
```

Numbers first. The playbook named and versioned. The action in the playbook's own words. The timeout stated. People read this because it is short and because the same fields appear every time. Reading it takes eight seconds. We measured.

## Timeouts and escalation

A proposal without a deadline is a question nobody has to answer. Each playbook sets a timeout and a fallback. For reversible actions on non-critical services, the fallback is to execute and notify. For anything touching data, the fallback is to page a human and do nothing.

The timeout is also where we caught our worst early bug. The agent posted a proposal, nobody answered, the timeout fired, and the agent posted the same proposal again as if the incident were new. Two engineers approved it four minutes apart, and the second approval tried to roll back a service that had already rolled back. The execution tool refused because the target revision was already live, which is why the tool checks preconditions. We fixed the agent to treat the thread as the unit of state. One incident, one thread, one proposal at a time.

## What the agent cannot do

The permission model is simpler to explain by what is missing.

- The agent has no tool that deletes anything.
- The agent has no tool that touches IAM.
- The agent cannot run a command that is not in a playbook. There is no shell.
- The agent cannot approve its own proposal, and neither can a bot account. Approvers are named humans in a Slack user group.
- The agent cannot edit the playbook repository. Changes go through a pull request that an engineer reviews.

When a client asks for a new capability, we write a playbook and add a scoped tool. The agent gets the capability on the day the pull request merges. This is slower than letting the model improvise. It is also why the client lets it run at 2 in the morning.

## Measuring whether the loop works

Three numbers go on the monthly report.

**Approval rate.** The share of proposals a human approved without changes. It started near 70 percent and sits around 92. The rejections are the interesting part. Each one is a playbook that needs a sharper condition.

**Time to approval.** Median under three minutes during business hours, under nine overnight. If this number grows, the messages have become noise.

**Override rate after approval.** How often a human later undid what the agent did. This has stayed below two percent, and every case has a thread to read.


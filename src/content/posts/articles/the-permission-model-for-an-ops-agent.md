---
title: "The permission model for an ops agent: playbooks, scopes and approvals"
description: "The four layers that let a Claude-based operations agent act on production infrastructure without anyone losing sleep."
pubDatetime: 2026-08-12T15:00:00Z
kind: article
theme: tools
tags: ["agents", "security", "claude", "infra"]
sources:
  - title: "Anthropic announces auto mode default for Claude Code from Aug 14"
    url: "https://claude.com/blog/auto-mode-default-in-claude-code"
    date: 2026-08-07
---

## Table of contents

## The first thing the agent did

The first time we ran the ops agent against a staging cluster, it did the right thing. A pod was crash looping. The agent read the logs, found a bad environment variable, proposed a fix and asked for approval. An engineer approved. The pod came back.

The second time, it proposed deleting a persistent volume. The volume was orphaned and the proposal was technically correct. Nobody approved it. That was the moment the permission model stopped being a design document and became the product.

This article describes the four layers we built. The agent runs on the Claude Agent SDK and reads alerts from Cloud Monitoring, but the layers are not specific to either.

## Layer one: identity scopes

The agent runs as its own service account. That account has read access to logs, metrics and cluster state across the projects it watches. It has write access to nothing by default.

Write permissions are granted per playbook, not to the agent. When the agent executes a playbook, it impersonates a playbook-specific service account with exactly the permissions that playbook needs. The restart playbook can restart deployments in one namespace. It cannot touch storage. The scale playbook can change replica counts within a bounded range. It cannot change images.

```yaml
# playbooks/restart-deployment.yaml
name: restart-deployment
service_account: ops-agent-restart@project.iam.gserviceaccount.com
scope:
  namespaces: ["api", "workers"]
  verbs: ["get", "list", "patch"]
  resources: ["deployments"]
preconditions:
  - alert_type in ["CrashLoopBackOff", "OOMKilled"]
  - restarts_in_last_hour < 3
approval: none
audit: required
```

The agent cannot invent a permission it does not have. If it proposes an action outside every playbook, the action fails at the IAM layer before any approval logic runs. That is the property I trust most. The model can be wrong. The service account cannot exceed its grant.

## Layer two: the playbook allowlist

A playbook is a named, reviewed procedure with preconditions and a bounded action. The agent does not write playbooks. Engineers do, in a repository, with code review.

The agent's job is to match an alert to a playbook, verify the preconditions from live data and either execute or propose. It can chain playbooks. It cannot compose new actions from primitives.

This felt restrictive at first. The team wanted the agent to be creative. Then we looked at what the model proposed during the first month without an allowlist. About a fifth of the proposals were things no engineer would have done. Not wrong exactly. Just not how we run production. The allowlist encodes how we run production.

There are twenty six playbooks now. The most used is restart-deployment. The least used is rotate-credential, which has run twice.

## Layer three: approval tiers

Every playbook declares an approval tier.

- **None.** The action is reversible in seconds and the blast radius is one workload. Restarts, cache flushes, log level changes. The agent executes and reports.
- **Single.** One on-call engineer approves in Slack with a button. Scaling, config rollbacks, traffic shifts.
- **Dual.** Two engineers approve, one of whom must be a service owner. Anything touching data, credentials or network policy.
- **Never.** The agent can propose but not execute. Deletions, IAM changes, anything in the billing project.

The approval message is the part I rewrote most. Early versions dumped the agent's full reasoning. Engineers stopped reading them. The current version is four lines. What is broken, what the agent will do, what it will cost or risk, and a link to the full trace. Approval rates went up and approval times went down when we cut the message.

## Layer four: the audit log

Every action, proposed or executed, writes a record before it runs and another after.

```json
{
  "run_id": "ops-2026-08-11-0342",
  "alert": "OOMKilled api-gateway-7c9f",
  "playbook": "restart-deployment",
  "preconditions_checked": {"restarts_in_last_hour": 1},
  "approval_tier": "none",
  "actor": "ops-agent-restart@...",
  "model": "claude-sonnet-5",
  "trace_url": "https://.../traces/ops-2026-08-11-0342",
  "outcome": "success",
  "duration_s": 41
}
```

The log lives in the client's BigQuery, not ours. It is append only. Security reviews it weekly. The record before the run matters as much as the one after. If the agent crashes mid-action, we know what it was attempting.

## A request that was correctly refused

Two weeks into production, the agent received an alert about disk pressure on a node pool. It read the metrics, found the log volume that was filling the disk, and proposed a remediation. Truncate the log directory on the affected nodes.

The playbook allowlist did not contain a truncate action. The agent could restart a deployment, scale a node pool, or rotate a log file through the standard tool. It could not delete anything. So the proposal was refused at layer two and the agent fell back to its next option. It rotated the log through the allowed tool, scaled the pool by one node, and opened a ticket describing what it had wanted to do and why it could not.

The on-call engineer read the ticket in the morning. The truncate would have worked. It would also have deleted logs that a separate audit job had not yet exported. Nobody had told the agent about the audit job because nobody had thought to. The permission model held the line that human knowledge had not been written down yet.

We did two things afterward. We added the audit job's export window to the runbook lookup skill so the agent knows about it now. And we added a scoped, time-limited truncate action to the allowlist, tier two approval, only for paths under a named prefix, only after the export job has reported success for that day.

This is how the allowlist grows. Not from a design session where we guess what the agent will need. From a refused request with a written reason, reviewed by a human who knows the environment, turned into a narrow permission with its conditions attached. Every entry in the list has a ticket behind it. The list is a record of what we learned.


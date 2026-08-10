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


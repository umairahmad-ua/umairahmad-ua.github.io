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


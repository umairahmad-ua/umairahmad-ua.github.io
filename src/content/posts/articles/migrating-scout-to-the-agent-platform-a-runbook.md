---
title: "Migrating Scout to the Gemini Enterprise Agent Platform: a runbook"
description: "Vertex AI is now the Gemini Enterprise Agent Platform and ADK Python 2.0 is GA. The steps my team followed to move Scout, and the eval gate that decided when we were done."
pubDatetime: 2026-05-27T15:00:00Z
kind: article
theme: platform
tags: ["gcp", "adk", "agents"]
sources:
  - title: "Google I/O 2026: Gemini 3.5 Flash, Antigravity 2.0, ADK Python 2.0 GA"
    url: "https://blog.google/innovation-and-ai/technology/developers-tools/google-io-2026-collection/"
    date: 2026-05-19
  - title: "Vertex AI name retired in favor of Gemini Enterprise Agent Platform"
    url: "https://en.wikipedia.org/wiki/Gemini_Enterprise_Agent_Platform"
    date: 2026-05-21
  - title: "MCP 2026-07-28 release candidate"
    url: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/"
    date: 2026-05-21
---

## Table of contents

## Two announcements in one week

[Google I/O](https://blog.google/innovation-and-ai/technology/developers-tools/google-io-2026-collection/) on May 19 made ADK Python 2.0 generally available. Two days later Google [retired the Vertex AI name](https://en.wikipedia.org/wiki/Gemini_Enterprise_Agent_Platform). Everything now lives under the Gemini Enterprise Agent Platform. Scout, the marketing intelligence system my team runs for Let's Forage, had been on Vertex AI Agent Engine and ADK 1.x since last autumn.

Nothing broke on May 21. Names in a console do not break running agents. But we had two migrations queued, a framework major version and a platform rename, and I wanted them done before the summer campaign season when the Apple and Meta teams use Scout most.

This is the runbook we followed. It took eleven working days. Most of that was the eval gate, not the code.

## Step zero: freeze the baseline

Before touching anything we ran the full Scout eval suite against production and stored the results as the baseline. 212 scenario cases across the nine agents, scored by a judge model on groundedness, task completion and tone, plus retrieval metrics on the research agents.

```bash
scout-eval run --env prod --tag baseline-2026-05-18 --out gs://scout-evals/baseline/
scout-eval report gs://scout-evals/baseline/ > baseline.md
```

The rule for the whole migration was written on the first page of the runbook. No cutover until the new stack scores within one point of the baseline on every agent, and no single case regresses from pass to fail without a written reason.


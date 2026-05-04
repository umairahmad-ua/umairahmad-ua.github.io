---
title: "Caching strategies for agents: prompt cache, retrieval cache, tool cache"
description: "Three caches sit at different layers of an agent system. Where each one lives, when it goes stale, and what it saved on a real planning workload."
pubDatetime: 2026-05-06T15:00:00Z
kind: article
theme: evals
tags: ["agents", "infra", "gcp"]
sources:
  - title: "OpenAI GPT-5.5 Instant"
    url: "https://openai.com/index/gpt-5-5-instant/"
    date: 2026-05-05
  - title: "Code with Claude 2026"
    url: "https://simonwillison.net/2026/May/6/code-w-claude-2026/"
    date: 2026-05-06
---

## Table of contents

## The bill that started it

In March a planning run for the apparel client cost four times what the same run cost in February. Nothing in the agent code had changed. The input had. A buyer sent a forecast file with twice the SKUs, and every specialist agent re-read the same product master on every turn. Same tokens, same tool results, same embeddings, paid for again and again inside one session.

That week I drew the three places a cache can live in an agent system. My team has used that drawing on every project since. This is what it says.


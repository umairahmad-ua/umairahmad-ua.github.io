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

## Three layers, three caches

An agent turn touches three kinds of expensive work. The model reads a long context. A retriever pulls documents. Tools call databases and APIs. Each has a cache with different rules.

**Prompt cache.** The model provider stores a prefix of the prompt and charges less to read it again. The stable part of an agent prompt is large. System instruction, tool schemas, few-shot examples, the session summary. On our planning orchestrator that prefix is about 18,000 tokens. The variable part, the current user turn and fresh tool results, is under 2,000.

**Retrieval cache.** The same query against the same corpus returns the same chunks until the corpus changes. We key on a hash of the normalized query plus the corpus version. The corpus version bumps when the ingestion pipeline commits new documents.

**Tool cache.** A tool call with the same arguments returns the same result until the underlying system changes. This is the cache people forget. It is also the one that saved the most money.


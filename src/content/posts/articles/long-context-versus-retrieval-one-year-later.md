---
title: "Long context versus retrieval, one year later"
description: "Million-token windows are normal now. On enterprise data my team still retrieves. Cost, freshness, access control and evals explain why, with numbers from a legal client."
pubDatetime: 2026-06-03T15:00:00Z
kind: article
theme: platform
tags: ["rag", "agents", "evals"]
sources:
  - title: "Anthropic releases Claude Opus 4.8"
    url: "https://code.claude.com/docs/en/whats-new/2026-w22"
    date: 2026-05-28
  - title: "Microsoft Build 2026"
    url: "https://news.microsoft.com/build-2026-live-blog/microsoft-build-2026-live/"
    date: 2026-06-02
---

## Table of contents

## The question a client asked

A legal operations team at a mid-size insurer asked me in April why we still bother with retrieval. Their contract corpus is about 9,000 documents. Claude Opus 4.6 had a million-token beta window since February. Gemini has had long windows for longer. [Claude Opus 4.8](https://code.claude.com/docs/en/whats-new/2026-w22) arrived last week. "Just put the contracts in the prompt" was the sentence.

I wrote a version of this article in February when I described [the retrieval blueprint my team reuses](/posts/articles/the-rag-blueprint-i-reuse/). Four months and two model generations later the answer has not changed. The reasons have gotten sharper.

## Do the arithmetic first

Nine thousand contracts average about 11,000 tokens each. That is roughly 100 million tokens. A million-token window holds one percent of the corpus. So "put it all in the prompt" was never an option for this client. The real question was whether to put a lot in the prompt, say the 80 most relevant contracts, or to retrieve a handful of passages.

We measured both on the client's own review workload. The task is clause comparison. Given a new contract, find how the indemnity, limitation of liability and termination clauses differ from the insurer's standard positions and from precedent contracts with the same counterparty.

## The experiment

Same model, same prompt template, same 60 review cases with lawyer-graded answers. Two conditions.

**Long context.** A lightweight filter picked the 80 most likely relevant contracts by counterparty and contract type, and we put their full text in the prompt. Around 900,000 tokens per request.

**Retrieval.** Hierarchical chunking at the clause level with parent context, hybrid dense and sparse search, cross-encoder reranking, top 12 passages. Around 14,000 tokens per request.

| | Long context | Retrieval |
|---|---|---|
| Lawyer-graded accuracy | 81% | 84% |
| Groundedness (judge) | 8.2 | 8.9 |
| Median latency | 71 s | 6 s |
| Cost per review | ~$3.10 | ~$0.09 |
| Wrong-counterparty citations | 7 of 60 | 0 of 60 |

The accuracy gap is small and within what I would expect to move with a better prompt. Everything else is not close.


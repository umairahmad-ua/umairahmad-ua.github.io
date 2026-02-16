---
title: "Hybrid retrieval and reranking: the RAG blueprint I reuse"
description: "The retrieval stack my team carries from client to client, why long context did not replace it, and where I stop building and use Vertex AI Search instead."
pubDatetime: 2026-02-22T15:00:00Z
kind: article
theme: tools
tags: ["rag", "gcp", "evals"]
sources:
  - title: "Anthropic: Claude Opus 4.6"
    url: "https://www.anthropic.com/news/claude-opus-4-6"
    date: 2026-02-05
  - title: "Anthropic: Claude Sonnet 4.6"
    url: "https://en.wikipedia.org/wiki/Claude_(language_model)"
    date: 2026-02-17
  - title: "Google: Gemini 3.1 Pro"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-02-19
---

A media client asked us a question in January that I have heard four times now in different words. "Claude and Gemini can read a million tokens. Why are we still chunking documents?" It is a fair question. Anthropic put Opus 4.6 out on February 5 with a 1M context beta. Gemini 3.1 Pro followed on February 19. The window keeps growing.

I still build retrieval for every enterprise client. This post is the blueprint I reuse and the reasons I have not thrown it away.


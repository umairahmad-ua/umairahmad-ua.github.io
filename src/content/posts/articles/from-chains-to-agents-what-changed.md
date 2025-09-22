---
title: "From LangChain chains to ADK agents: what changed in how I design"
description: "Two years of building chains taught me to think in fixed graphs. Three months on Google ADK taught me where that thinking breaks and what replaces it."
pubDatetime: 2025-09-28T15:00:00Z
kind: article
theme: structure
tags: ["agents", "adk", "gcp"]
sources:
  - title: "Introducing upgrades to Codex (GPT-5-Codex)"
    url: "https://openai.com/index/introducing-upgrades-to-codex/"
    date: 2025-09-15
  - title: "Google Agent Development Kit documentation"
    url: "https://google.github.io/adk-docs/"
    date: 2025-06-01
---

In July I sat in a review with a client team and drew a box diagram on the whiteboard. Ingest, retrieve, rerank, answer. Four boxes, three arrows. Someone asked what happens when the user asks a follow-up that needs a different data source. I started drawing a fifth box. Then a sixth. By the time I stopped, the diagram had eleven boxes and I no longer believed in it.

That was the moment I understood that I had spent two years designing chains, and the problem in front of me was not a chain.


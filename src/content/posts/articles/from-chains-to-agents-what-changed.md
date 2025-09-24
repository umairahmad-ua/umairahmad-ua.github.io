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

## Table of contents

## Where I was coming from

At Developers Inc I built retrieval and orchestration systems on LangChain for two years. Document ingestion with OCR. Recursive and semantic chunking. Pinecone with namespace isolation. Custom chains for multi-step reasoning with Pydantic output parsing. It worked. The medical claims system I led there still runs at 50K claims a day, and rejections fell 35 percent after we put it in.

A chain is a directed graph you draw in advance. Each node has a prompt. Each edge is a decision you made before any user showed up. That is the strength. You can read the graph and know what the system will do. You can test each node in isolation. You can put a price on a run because the path is fixed.

It is also the weakness. Every new question shape means a new path. Every new path is a code change. The graph grows until nobody can hold it in their head.


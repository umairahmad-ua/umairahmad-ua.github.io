---
title: "Multi-model agents: Gemini and Claude in one system"
description: "How my team splits agent steps between Gemini and Claude behind one MCP tool layer, evaluates each model separately, and keeps vendor risk boring."
pubDatetime: 2026-08-05T15:00:00Z
kind: article
theme: platform
tags: ["agents", "gemini", "claude", "mcp", "evals"]
sources:
  - title: "Alibaba Qwen3.8-Max cloud release"
    url: "https://github.com/QwenLM/Qwen3.8"
    date: 2026-08-03
  - title: "Claude Enterprise inference hooks beta"
    url: "https://github.com/jqueryscript/anthropic-claude-timeline"
    date: 2026-08-05
---

## Table of contents

## The question a CFO asked

In July a client's CFO asked me a question I had not been asked before. "If Google doubled the price of Gemini tomorrow, what happens to our system?" I gave a vague answer about abstraction layers. He did not accept it. He wanted to know which parts of the system would keep running and which would stop.

I went back to the team and we drew the answer on a whiteboard. It turned out we already had a multi-model system. We had just never designed it as one. This article is what we made explicit.

## Which model does which step

The system in question is a document processing pipeline for a specialty insurer. Claims arrive as PDFs, scanned letters and email threads. The agents extract fields, check them against policy terms, draft a response and route hard cases to an adjuster.

Here is the split we ended up with.

| Step | Model | Why |
|---|---|---|
| Classification and routing | Gemini 3.7 Flash | Cheap, fast, tolerant of noisy input |
| Field extraction from scans | Gemini 3.6 Flash with Vertex AI Search grounding | Native document handling on the platform we already run |
| Policy interpretation | Claude Opus 5 | Long context, careful with conditional language |
| Response drafting | Claude Sonnet 5 | Tone control, cheaper than Opus |
| Adjuster summary | Gemini 3.7 Flash | Structured, short, high volume |

The pattern is simple once you see it. The cheap model handles volume. The expensive model handles judgment. Each vendor gets the steps it is good at, and no single step depends on a single vendor being available.


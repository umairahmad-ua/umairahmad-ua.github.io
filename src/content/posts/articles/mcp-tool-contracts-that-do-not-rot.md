---
title: "MCP tool contracts that do not rot"
description: "A practical guide to designing tool interfaces for agents under the Model Context Protocol: names, types, errors, idempotency, versions, and the gap between schema and model."
pubDatetime: 2025-12-14T15:00:00Z
kind: article
theme: tools
featured: true
tags: ["mcp", "agents"]
sources:
  - title: "One year of MCP: the 2025-11-25 specification release"
    url: "https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/"
    date: 2025-11-25
  - title: "Linux Foundation announces the Agentic AI Foundation"
    url: "https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation"
    date: 2025-12-09
---

We had a tool called `get_data`. It took a string called `query`. It returned a string. For about two weeks it was the most called tool in the system and nobody could say what it did, because what it did depended on what the model typed into `query` that day.

I deleted it. The replacement was four tools with boring names and typed arguments. The agent got more accurate the same afternoon, and I did not change a single prompt.

That is the whole thesis of this post. The tool contract is part of the prompt. It is the part you can type check.

## Table of contents


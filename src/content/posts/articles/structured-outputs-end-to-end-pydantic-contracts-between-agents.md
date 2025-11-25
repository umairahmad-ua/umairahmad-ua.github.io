---
title: "Structured outputs end to end: Pydantic contracts between agents"
description: "Every handoff between agents is a place to lose information. How my team types those handoffs, versions the schemas, and counts validation failures as a first-class metric."
pubDatetime: 2025-11-26T15:00:00Z
kind: article
theme: tools
tags: ["agents", "adk", "evals"]
sources:
  - title: "Google releases Gemini 3 Pro"
    url: "https://blog.google/products-and-platforms/products/gemini/gemini-3-collection/"
    date: 2025-11-18
  - title: "Anthropic releases Claude Opus 4.5"
    url: "https://en.wikipedia.org/wiki/Claude_(language_model)"
    date: 2025-11-24
  - title: "MCP specification 2025-11-25"
    url: "https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/"
    date: 2025-11-25
---

## Table of contents

## The handoff that dropped the budget

In Scout, the research assistant agent gathers data and passes findings to the research author agent, which writes the analysis. For two weeks in September the author kept producing recommendations with no budget context. The strategist would ask about a campaign with a fixed spend, and the author would suggest ideas that cost three times that.

The research assistant had the budget. It said so in its output, in a sentence, somewhere in paragraph four. The author agent did not always find it.

That is a handoff failure. The information existed and was lost in transit because the transit was prose. We fixed it in an afternoon by making the handoff a typed object with a required `budget` field. The author cannot miss a field. The assistant cannot omit it.

This article is about doing that everywhere.

## Prose is a lossy channel

When agent A writes a paragraph and agent B reads it, three things go wrong at once. A decides what to include and might leave something out. B decides what to extract and might miss something. Neither failure produces an error. The system keeps running and the output is a little worse.

A typed contract fixes all three. A must produce every required field or the validation fails. B receives fields, not prose, and does not have to extract anything. A missing or malformed value is an error, logged and counted.

This is not a new idea. It is what every API does. Agents somehow made us forget it for a year.


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

## The contract

Every agent in our systems has an input model and an output model. Pydantic, because the whole team knows it and because the Gemini and Claude APIs both accept a JSON schema derived from it.

```python
from pydantic import BaseModel, Field
from typing import Literal

class Finding(BaseModel):
    claim: str = Field(description="One factual statement about the audience or market.")
    evidence_ids: list[str] = Field(min_length=1, description="Source record ids from the search tool.")
    confidence: Literal["high", "medium", "low"]

class ResearchBrief(BaseModel):
    schema_version: Literal["2"] = "2"
    brand_id: str
    question: str
    budget_usd: int | None = Field(description="Null only if the user did not state one.")
    time_window: str
    findings: list[Finding] = Field(min_length=3, max_length=12)
    gaps: list[str] = Field(description="Questions the research could not answer.")
```

The `evidence_ids` requirement is the important one. A finding without evidence cannot be constructed. The author agent can only cite what the assistant grounded. Hallucinated findings do not get a field to live in.

The `gaps` list is the second most important. An agent that must list what it did not find is an agent that is allowed to say so. Without the field, the model fills the silence with something plausible.

## Getting the model to comply

Gemini supports response schemas natively. So does Claude through tool definitions. Both work well for flat models and reasonably for nested ones. Both occasionally produce output that passes the schema and fails the intent, like an `evidence_ids` list containing a made-up id.

So there are two layers of validation. Pydantic checks shape. A second function checks meaning: every evidence id must exist in the tool results from this run, `budget_usd` must match a number in the user's message if one was present, `time_window` must parse.

When either layer fails, the agent gets one retry with the validation error in the prompt. Most failures fix themselves on retry. The ones that do not are logged as a hard failure and the run falls back to a simpler path.

Since Gemini 3 Pro arrived last week, the first-pass compliance rate on our schemas went up noticeably. I have not yet re-run the comparison against Claude Opus 4.5 from Monday. That comparison is on the list. Model quality improves compliance. It does not remove the need for the check.


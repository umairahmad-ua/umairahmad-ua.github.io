---
title: "Structured outputs end to end: Pydantic contracts between agents"
description: "Every handoff between agents is a place to lose information. How my team types those handoffs, versions the schemas, and counts validation failures as a first-class metric."
pubDatetime: 2025-11-26T15:00:00Z
kind: article
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
diagram:
  caption: "Agent handoffs as typed Pydantic contracts, validated for shape and meaning, versioned, and counted when they fail."
  nodes:
    - { id: "user", label: "Strategist question", col: 0, kind: "source" }
    - { id: "search", label: "Vertex AI Search results", col: 0, kind: "tool" }
    - { id: "asst", label: "Research assistant agent", col: 1, kind: "agent" }
    - { id: "brief", label: "ResearchBrief schema v2", col: 2, kind: "tool" }
    - { id: "shape", label: "Pydantic shape check", col: 3, kind: "tool" }
    - { id: "meaning", label: "Meaning check on evidence", col: 3, kind: "tool" }
    - { id: "version", label: "schema_version check", col: 3, kind: "tool" }
    - { id: "metric", label: "Validation failure metric", col: 4, kind: "store" }
    - { id: "author", label: "Research author agent", col: 4, kind: "agent" }
    - { id: "out", label: "Analysis with budget", col: 5, kind: "output" }
  edges:
    - ["user", "asst"]
    - ["search", "asst", "evidence ids"]
    - ["asst", "brief", "typed output"]
    - ["brief", "shape"]
    - ["brief", "meaning"]
    - ["brief", "version"]
    - ["shape", "asst", "one retry"]
    - ["meaning", "asst", "one retry"]
    - ["shape", "metric", "by agent and field"]
    - ["meaning", "metric"]
    - ["shape", "author"]
    - ["meaning", "author"]
    - ["version", "author", "accepted versions"]
    - ["author", "out", "budget_usd required"]
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

## Versioning

Schemas change. Findings gain a field, a Literal gains a value, a list gets a new bound. In a system where six agents pass objects around, a schema change in one place breaks others silently unless it is versioned.

Every model carries a `schema_version`. Every agent declares which versions it accepts. When the research brief moved from version 1 to version 2, the author agent accepted both for a week while we confirmed the new fields were populated correctly, then dropped version 1.

This felt like ceremony when we started. It stopped feeling like ceremony the first time a prompt change made an agent emit an old shape and the version check caught it before the author agent produced garbage.

The MCP specification released [yesterday](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) takes a similar view for tools. Typed inputs and outputs, declared capabilities, version negotiation. The protocol is formalizing what we were already doing between agents. That is a good sign for the pattern.

## Validation failures are a metric

The most useful thing we did was count.

Every validation failure, shape or meaning, first attempt or retry, goes to a metric labeled by agent, schema and field. We graph it next to task success rate and cost.

The graph tells stories. A spike in `evidence_ids` failures on the research assistant after a prompt change means the change made the model sloppier about grounding, even if the final output looked fine. A slow climb in `budget_usd` nulls means users stopped stating budgets, which is a product question, not a model question.

Before we counted, a schema failure was an exception in a log. After, it is a signal we act on. Some of our best prompt fixes came from noticing which field failed most.

## Where this does not work

Free-form creative output. The big idea agent in Scout produces campaign concepts. Forcing that into a rigid schema made the concepts worse, flatter, more list-like. We type the metadata around the concept, like the audience it targets and the evidence it draws on, and leave the concept itself as a string.

Very deep nesting. Models handle two or three levels well. Beyond that, compliance drops and retries climb. When a schema wants to go deeper, that is usually a sign the agent is doing two jobs and should be two agents.

Latency-sensitive paths. Validation plus retry adds time. For a help desk agent answering a factual question, we accept a looser contract and a faster answer. For a research brief that will drive a campaign, we take the extra seconds.

## A note on tooling

We generate the JSON schema from the Pydantic model at build time and check it into the repo next to the prompt. A schema diff in a pull request is reviewed like an API change, because it is one. The eval set for each agent includes the contract check, so a prompt that produces valid prose and invalid objects fails before merge. None of this needed a framework. Pydantic, a schema file, a counter and a graph.

## The rule now

If two agents exchange information, the exchange has a Pydantic model, the model has a version, and failures are counted. No exceptions since September.

The author agent has not lost a budget since.

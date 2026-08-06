---
title: "Multi-model agents: Gemini and Claude in one system"
description: "How my team splits agent steps between Gemini and Claude behind one MCP tool layer, evaluates each model separately, and keeps vendor risk boring."
pubDatetime: 2026-08-05T15:00:00Z
kind: article
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

## One tool layer, two brains

The part that makes this work is the tool layer. Every tool the agents call is an MCP server. The policy lookup, the claims database, the document store, the email sender. Both model families speak MCP, so the tool code is written once.

```python
# tools/policy_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("policy")

@mcp.tool()
def get_policy_terms(policy_id: str) -> dict:
    """Return the coverage terms for a policy as structured JSON."""
    return policy_repo.terms(policy_id)

@mcp.tool()
def check_exclusion(policy_id: str, claim_category: str) -> dict:
    """Return whether a claim category is excluded and the clause that says so."""
    return policy_repo.exclusion(policy_id, claim_category)
```

On the Gemini side the ADK agent registers the server as a toolset. On the Claude side the Agent SDK connects to the same server. When we swapped the policy interpretation step from Gemini to Claude in June, the tool code did not change. The prompt changed. The eval set did not.

That is the concrete answer to the CFO. If Gemini doubled in price, three steps would move to Claude or an open model within a sprint. The tools stay. The evals stay. The prompts get rewritten.

## Evals per model, not per system

The mistake we made early was one eval suite for the whole pipeline. When the score dropped, we could not tell which model caused it.

Now each step has its own eval set and its own judge. The extraction step has two hundred labeled documents with ground truth fields. The policy step has eighty claim scenarios with an adjuster's ruling. The drafting step has a rubric scored by a judge model that is never the same family as the model being judged. Claude drafts get judged by Gemini. Gemini summaries get judged by Claude.

The cross-family judge matters. Models are kind to their own output. We measured this in May on the drafting step. A Sonnet judge scored Sonnet drafts four points higher than a Gemini judge did on the same rubric. The Gemini judge was closer to what the adjusters said.

## What the open models change

On Sunday Alibaba released [Qwen3.8-Max](https://github.com/QwenLM/Qwen3.8) for cloud use. I read the model card on Monday morning with this client in mind. The extraction step is the one where an open model could plausibly take over. The inputs are messy and the outputs are structured. That is a task where the gap between frontier and open models is smallest.

We are not moving it yet. The reason is not quality. It is that the Flash models are already cheap enough that the extraction step is under a tenth of the cost per claim. The judgment steps are where the money goes, and those are where I want the strongest model I can buy.

## Inference hooks and the audit trail

Today Anthropic put [inference hooks](https://github.com/jqueryscript/anthropic-claude-timeline) into beta for Claude Enterprise. For a regulated client this is the feature I have been waiting for. A hook runs before and after every model call. We can log the full prompt, the tool calls and the response into the client's own storage without changing agent code.

We already do this on the Gemini side through Agent Engine tracing. Having the same shape on the Claude side means the audit trail is uniform. An adjuster or a regulator can follow a claim through both model families in one view.

## Vendor risk as a design input

The honest summary is that multi-model was not a goal. It was a consequence of choosing the right model for each step and then noticing that the choices spanned two vendors.

What I now do deliberately:

- Every tool is MCP. No vendor-specific tool bindings in agent code.
- Every step has a named fallback model from another family, tested quarterly.
- Every step has its own eval set and a cross-family judge.
- Cost per task is tracked per step, so we know which vendor's price matters.

None of that is exotic. It is the same discipline as keeping a database behind an interface. The difference is that model prices and capabilities move every month, so the interface gets exercised more than most.

## What I tell clients now

When the CFO question comes up, and it now comes up in most presales calls, I show the table above. Then I show the eval scores per step. Then I show how long the last model swap took.

That last number is the one that lands. A swap that takes a sprint is a risk you can budget for. A swap that takes a quarter is a dependency you cannot escape. The whole point of the architecture is to keep it at a sprint.

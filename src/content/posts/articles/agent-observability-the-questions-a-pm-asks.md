---
title: "Agent observability: traces, spans and the questions a PM asks"
description: "What we log for every agent run, how OpenTelemetry GenAI conventions and Langfuse fit together, and the five questions a product manager asked that our traces could not answer."
pubDatetime: 2025-12-31T15:00:00Z
kind: article
tags: ["agents", "infra", "evals"]
sources: []
---

## Table of contents

## The question that broke our dashboards

In October a product manager at a media client asked me a plain question. "Why did the campaign draft for the Tuesday brief cost four times the Monday one?"

We had dashboards. Latency by agent. Tokens by model. Error rate by hour. None of them could answer her question. We could see that Tuesday cost more. We could not see why, because the spend was spread across nine agents and forty tool calls and our logs were flat lines with a timestamp and a message.

That question is the reason we rebuilt observability for every agent my team runs. This is what we log now, how the pieces fit, and the questions we can answer as a result.

## Traces, not logs

An agent run is a tree. The root is the user request. Under it, the orchestrator decides. Under that, sub-agents run. Under each sub-agent, model calls and tool calls. A flat log loses the tree. A trace keeps it.

We emit one trace per agent run. Every model call, tool call, retrieval and handoff is a span with a parent. The span carries attributes. Which agent. Which prompt version. Which model. Input tokens, output tokens, cached tokens. Latency. Cost in dollars, computed at write time from a price table. For tool spans, the tool name, the argument hash, and whether the call succeeded.

We follow the OpenTelemetry GenAI semantic conventions for attribute names. That decision cost us a week of renaming in November and it was worth it. Langfuse reads those attributes natively. Cloud Trace reads them. When we swapped one Gemini agent for a Claude one in a pilot, the spans looked identical to the dashboards. Vendor-specific logging would have meant two dashboards.

The stack, for anyone building the same thing:

```text
Instrumentation   OpenTelemetry Python SDK, GenAI semantic conventions
ADK hook          a callback on every agent, model and tool event
Export            OTLP to Langfuse (primary) and Cloud Trace (retention)
Storage           Langfuse Postgres for 30 days, BigQuery export for history
Dashboards        Langfuse for engineers, Looker on BigQuery for the client
Alerts            Cloud Monitoring on cost per trace and error rate
```

## The five questions a PM asks

The product manager's Tuesday question was the first of five that now define what a trace must be able to answer. I keep the list on the wall.

**Why did this run cost what it cost.** The trace shows spend per span. Her Tuesday brief cost four times Monday's because the research agent ran retrieval three times. The brief mentioned a competitor whose name matched two products in the client's data. The reranker kept returning both and the agent kept retrying. One line in the trace tree. Twenty minutes to find, ten minutes to fix.

**What did the agent know when it decided.** Every model span stores the prompt it received, with retrieval results and tool outputs inlined. When a client says an answer was wrong, we replay the exact context. Two-thirds of the time the context was wrong and the model was right about the wrong context.

**Which version produced this.** Prompt version and model version are on every span. When a regression shows up in the evals, we filter traces by version and see whether production users hit it before the gate did.

**How often does the human override.** Our agents route some outputs to a human queue. The trace records whether the human accepted, edited or rejected. The override rate per agent per week is the number I watch most. Rising override rate means the agent is drifting or the world changed.

**Where does the time go.** Latency per span, summed up the tree. Most of our end-to-end latency is not the model. It is sequential tool calls that could run in parallel and retrieval that could be cached.

## What not to log

Traces hold prompts. Prompts hold client data. For the healthcare and finance clients, the prompt can hold protected information.

We run every span through a redaction step before export. Names, identifiers, account numbers and anything the DLP API flags get replaced with typed placeholders. The placeholder keeps the shape, so a replay still works, but the value is gone. The raw prompt is stored separately, encrypted, in the client's own project, with a fourteen-day retention.

This was a hard argument inside the team. Engineers want raw traces. Debugging with placeholders is slower. The compliance team was right and we lost a few hours a month to it. We have not lost a client.

We also do not log the full retrieval corpus into the span. We log document identifiers and the chunk hashes. The dashboards link back to the source. Traces stayed under a few kilobytes each instead of a few megabytes.

## Cost as a first-class attribute

The single most useful decision was computing cost at write time. Every model span has a dollar value, from a price table that we version alongside the prompts. When a vendor cuts prices, we update the table and new spans reflect it. Old spans keep the old price, which is what actually was paid.

That made cost a thing you can group and sort like latency. Cost per agent. Cost per client. Cost per prompt version. Cost per task type. When the finance person at a client asks what the agent costs per completed brief, we have the number by the end of the call.

## The ADK hook, in practice

For anyone on Google ADK, this is roughly where the instrumentation lives. Every agent gets the same callbacks. Nothing is instrumented by hand inside an agent.

```python
from opentelemetry import trace
from google.adk.agents import Agent

tracer = trace.get_tracer("agents")

def before_model(ctx, request):
    span = tracer.start_span("gen_ai.chat")
    span.set_attribute("gen_ai.system", "gcp.vertex_ai")
    span.set_attribute("gen_ai.request.model", request.model)
    span.set_attribute("agent.name", ctx.agent_name)
    span.set_attribute("prompt.version", ctx.state.get("prompt_version"))
    ctx.state["_span"] = span

def after_model(ctx, response):
    span = ctx.state.pop("_span")
    usage = response.usage_metadata
    span.set_attribute("gen_ai.usage.input_tokens", usage.prompt_token_count)
    span.set_attribute("gen_ai.usage.output_tokens", usage.candidates_token_count)
    span.set_attribute("cost.usd", price(response.model, usage))
    span.end()

agent = Agent(
    name="campaign_author",
    model="gemini-2.0-flash",
    before_model_callback=before_model,
    after_model_callback=after_model,
)
```

Tool callbacks look the same with a tool span. The redaction step runs inside an exporter wrapper so the agent code never sees it. When we added a Claude agent through its own SDK, we wrote the same two callbacks against that SDK's hooks and the dashboards did not change.

The one thing I would do differently from the start is the price table. We began with prices hardcoded in the callback. They changed three times in the autumn. The table now lives in a config file with a version and an effective date, and the span records which version priced it.

## What changed for the team

Three things. Engineers now debug in the trace viewer, not in log search. A failure report comes with a trace link, not a description. And the eval harness reads from the same traces, so a production failure becomes an eval case in a few minutes instead of an afternoon of reconstruction.

The product manager still asks hard questions. Now the answer is usually a link.

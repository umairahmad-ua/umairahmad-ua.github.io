---
title: "Model routing: when Flash is enough and when it is not"
description: "Most agent steps do not need the best model. How my team routes each step to the cheapest model that passes its eval, and what happens when that logic is wrong."
pubDatetime: 2025-12-17T15:00:00Z
kind: article
tags: ["agents", "evals", "gemini"]
sources:
  - title: "Google releases Gemini 3 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2025-12-17
  - title: "OpenAI releases GPT-5.2"
    url: "https://en.wikipedia.org/wiki/GPT-5.2"
    date: 2025-12-11
diagram:
  caption: "Each step runs on the cheapest model that passes its eval, with a pricier fallback and the choice on the trace."
  nodes:
    - { id: "evals", label: "Step eval sets", col: 0, kind: "tool" }
    - { id: "config", label: "Routing YAML per step", col: 1, kind: "store" }
    - { id: "input", label: "Step input", col: 1, kind: "source" }
    - { id: "router", label: "route(step, input)", col: 2, kind: "tool" }
    - { id: "flash", label: "Gemini 3 Flash", col: 3, kind: "model" }
    - { id: "pro", label: "Gemini 3 Pro fallback", col: 3, kind: "model" }
    - { id: "trace", label: "Trace with model id", col: 4, kind: "store" }
    - { id: "dash", label: "Cost and fallback rate", col: 5, kind: "output" }
  edges:
    - ["evals", "config", "cheapest that passes"]
    - ["config", "router"]
    - ["input", "router", "length, confidence"]
    - ["router", "flash", "under 2k tokens"]
    - ["router", "pro", "timeout or unsure"]
    - ["flash", "trace"]
    - ["pro", "trace"]
    - ["trace", "dash", "per step, per model"]
---

## Table of contents

## The invoice that started it

In October a client asked why their agent bill had doubled in a month. Usage had not doubled. We had changed the default model for every agent in the system to the newest Pro model because a demo went well on it. Every step, from intent classification to final answer, ran on the most expensive option we had.

Intent classification does not need a frontier model. It needs to pick one of nine labels correctly. We were paying Pro prices for a task a small model does as well.

That invoice turned into a rule. Every step in every agent declares which model it runs on, and the default is the cheapest model that passes that step's eval. This article is how the routing works and what it has taught us.

## Steps, not agents

The unit of routing is a step, not an agent. The Scout research assistant has four steps: understand the question, plan the searches, run the searches, summarize the results. The first is a classification task. The second is light reasoning. The third is tool calls with no generation. The fourth is where the writing quality matters.

Routing at the agent level would put all four on the same model. Routing at the step level puts the first three on Flash and the fourth on Pro. The cost difference is large because steps one to three run far more often than step four.

The configuration lives outside the code:

```yaml
research_assistant:
  understand_question:
    model: gemini-3-flash
    fallback: gemini-3-pro
    eval_threshold: 0.97
  plan_searches:
    model: gemini-3-flash
    fallback: gemini-3-pro
    eval_threshold: 0.92
  run_searches:
    model: none
  summarize:
    model: gemini-3-pro
    eval_threshold: 0.90
```

The threshold is the score the step must reach on its eval set for the assigned model to stay assigned. Below that, the CI job fails and someone has to either fix the prompt or move the step up a tier.

## How the eval decides

Each step has a small eval set. Twenty to eighty cases with a known good output or a judge rubric. When we consider a model for a step, we run the set against every candidate and record score, latency and cost.

Then the rule is mechanical. Pick the cheapest model whose score clears the threshold. If none does, pick the best and open a ticket.

Google released [Gemini 3 Flash](https://en.wikipedia.org/wiki/Gemini_(language_model)) today. Tonight the eval job runs it against every step currently on Pro. Any step where Flash clears the threshold moves to Flash tomorrow. That is not a decision meeting. It is a cron job.

This is what routing by eval buys. A new cheaper model is a cost reduction we get by running a script, not by re-architecting.

## Illustrative numbers

These are shaped like our numbers but rounded and simplified, so read them as an example.

| Step | Calls per day | Model before | Model after | Cost before | Cost after |
|---|---|---|---|---|---|
| Understand question | 6,000 | Pro | Flash | $48 | $4 |
| Plan searches | 6,000 | Pro | Flash | $72 | $6 |
| Summarize | 1,500 | Pro | Pro | $90 | $90 |
| Big idea | 400 | Pro | Pro | $60 | $60 |
| Help desk answer | 3,000 | Pro | Flash | $36 | $3 |

The summarize and big idea steps stay on Pro. They are where quality is visible to the user. Everything else moved. Total cost dropped to under half with no measurable change in the end-to-end eval. The client's invoice question went away.

## When Flash is not enough

The eval threshold catches most of it. Three cases slipped through anyway and taught us where the threshold approach is thin.

Long inputs. Flash cleared the threshold on the plan searches step with typical questions. It fell apart on a question with a two page pasted brief. The eval set had no long inputs. We added some, Flash failed them, and the step now routes on input length: Flash under two thousand tokens, Pro above.

Ambiguity. The understand question step classifies intent. On clear questions Flash is as good as Pro. On ambiguous ones Flash picks confidently and wrongly, where Pro more often asks a clarifying question. The eval scored labels, not the decision to ask. We added "ask for clarification" as a valid label and reweighted the set. Flash's score dropped below threshold for ambiguous inputs. Now the step tries Flash and escalates to Pro when Flash's own confidence is low.

Tone. The help desk agent answers factual questions about the product. Flash gets the facts right. Users rated its answers as curt. The judge rubric scored correctness, not tone. We added a tone dimension. Flash still passes, barely, with a revised prompt. Pro would pass easily. We kept Flash and changed the prompt because the cost difference is meaningful at that call volume. That is a judgment call, and the eval made it a visible one instead of a hidden one.

## Fallbacks

Every step has a fallback model, and a fallback is triggered by three things. A validation failure after retry. A timeout. A confidence signal below a floor, where the step exposes one.

The fallback is always more expensive. That is fine. Fallbacks are supposed to be rare. When a step's fallback rate climbs above a few percent, that is a signal the primary model is wrong for the step, and the eval threshold probably needs to be tighter.

We graph fallback rate per step. It is the second most useful chart on the dashboard, after cost per completed task.

## The other side of the market

OpenAI released [GPT-5.2](https://en.wikipedia.org/wiki/GPT-5.2) last week. We run on Google Cloud and use Gemini as the default with Claude for specific agents, so it does not enter our routing table. I still read the release notes, because every price and quality move at the top of the market pulls the rest of the tiers with it. Routing by eval means we are ready when a tier shifts. Routing by habit means we find out from an invoice.

## How the routing is implemented

The router is a thin function. It reads the step configuration, checks the input length and any confidence signal, picks a model, and records the choice on the trace. The agent code calls `route(step_name, input)` and gets back a model id. Nothing about the agent knows which model it is on, which is the point. When the cron job moves a step to a new model, the only diff is in the YAML. The trace carries the model id, so cost per completed task can be broken down by model after the fact.

## The rule

A step runs on the cheapest model that passes its eval. The eval decides, not the demo. New models enter through a cron job, not a meeting. Fallback rate is a health metric.

Two months in, nobody has asked about an invoice.

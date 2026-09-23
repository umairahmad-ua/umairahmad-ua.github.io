---
title: "Opus 5.5 and GPT-6 Sol: re-running the cost model"
description: "Two price cuts landed on the same Tuesday. I re-ran cost per task across four production agents the next morning. Which steps moved, which stayed on Flash, and what the routing table looks like now."
pubDatetime: 2026-09-23T15:00:00Z
kind: article
theme: evals
tags: ["agents", "infra", "claude"]
sources:
  - title: "xAI Grok 4.7"
    url: "https://x.ai/news/grok-4-7"
    date: 2026-09-21
  - title: "AWS open-sources the Strands harness"
    url: "https://strandsagents.com/blog/introducing-strands-harness/"
    date: 2026-09-21
  - title: "Anthropic: Claude Opus 5.5"
    url: "https://www.anthropic.com/claude-opus-5-5"
    date: 2026-09-22
  - title: "OpenAI: introducing GPT-6 Sol and Luna"
    url: "https://openai.com/index/introducing-gpt-6-sol-and-luna/"
    date: 2026-09-22
---

## Table of contents

## Tuesday, twice

Anthropic released [Claude Opus 5.5](https://www.anthropic.com/claude-opus-5-5) on Tuesday morning at four dollars per million input tokens and twenty out, 40 percent below Opus 5. By the afternoon OpenAI had [GPT-6 Sol and Luna](https://openai.com/index/introducing-gpt-6-sol-and-luna/) out at half the GPT-5.6 price, two and ten for Sol, ten cents and fifty for Luna. Monday had already brought [Grok 4.7](https://x.ai/news/grok-4-7) at two and six.

I have written before that cost per completed task is the number that decides whether an agent survives. A price cut of this size is the kind of event that model was built for. So on Wednesday morning I re-ran it across the four agents my team runs in production, and this is what moved.

## How the model works

Each agent has a cost sheet. Each step in the agent names the model it uses, the average input and output tokens per call from the last thirty days of traces, the average number of calls per completed task, and any non-model cost such as a BigQuery scan or a human review minute at a loaded rate. Multiply through, sum, and you have cost per completed task. Divide the eval score by it and you have the number we compare across candidates.

The sheet is not a spreadsheet anymore. It is a BigQuery view over the trace table, with the price list in a small table that I edit by hand when vendors change it. Tuesday meant two edits. Wednesday meant reading the result.

## Agent one: the migration validator

This agent reconciles a migrated BigQuery table against its legacy source. It reads schemas, writes comparison queries, interprets the results and drafts a report. The reasoning step used Opus 5 because the comparisons are long and the cost of a wrong conclusion is a bad cutover.

Illustrative numbers from the sheet, rounded. Before Tuesday a validation batch cost about 11 dollars, of which roughly seven was the reasoning step. After the Opus 5.5 price, the same step is about four. Batch cost dropped to a little under eight. The report-drafting step stays on Gemini Flash because the eval score for drafting is identical between Flash and anything larger, and it was already cheap.

Decision: move the reasoning step to Opus 5.5 after the eval set passes. The eval set passed Wednesday afternoon. The switch went live Thursday.

## Agent two: the ops agent

This is the Claude-based operations agent that proposes actions in Slack. Its token cost per incident was already small. The price cut took it from roughly 40 cents of model cost per incident to about 25.

The total cost per incident barely moved, because the model was never the cost. Human approval time at a loaded rate is about three dollars per incident. Tool calls against logging and monitoring APIs are another dollar. A 40 percent model discount is a four percent discount on the task.

Decision: nothing changes. This agent's cost problem is approval time, and the fix for that is better playbooks, not a cheaper model.

## Agent three: Scout

Scout is the marketing intelligence system for Let's Forage. Nine agents, most of them on Gemini Flash, two authoring agents on a larger Gemini model. Nothing in Scout runs on Claude or GPT today, so Tuesday's prices change nothing directly.

Indirectly they change the conversation. When Opus class reasoning costs four dollars per million, the question of whether the two authoring agents should be evaluated against a Claude candidate is worth an afternoon. I added it to the eval backlog. I did not reroute anything.

## Agent four: the supply chain planner

The planning orchestrator for the apparel client calls a forecast tool, a solver and a narration step. The narration explains the plan to a planner in plain language and was on GPT-5.6 Sol. GPT-6 Sol at half price cuts that step in half. The solver is OR-Tools and costs nothing per call. The forecast tools are classical models.

Decision: switch the narration step to GPT-6 Sol after the eval set passes. It passed. The switch is scheduled for Monday because the client reviews changes weekly.


---
title: "Model routing: when Flash is enough and when it is not"
description: "Most agent steps do not need the best model. How my team routes each step to the cheapest model that passes its eval, and what happens when that logic is wrong."
pubDatetime: 2025-12-17T15:00:00Z
kind: article
theme: evals
tags: ["agents", "evals", "gemini"]
sources:
  - title: "Google releases Gemini 3 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2025-12-17
  - title: "OpenAI releases GPT-5.2"
    url: "https://en.wikipedia.org/wiki/GPT-5.2"
    date: 2025-12-11
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


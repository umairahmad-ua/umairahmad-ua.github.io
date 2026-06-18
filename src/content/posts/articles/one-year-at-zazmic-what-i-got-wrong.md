---
title: "One year at Zazmic: what I got wrong about multi-agent systems"
description: "Five things I believed about agents when I joined Zazmic in June 2025, what replaced each belief, and what changed in how my team works."
pubDatetime: 2026-06-21T15:00:00Z
kind: article
theme: leadership
featured: true
tags: ["agents", "gcp", "claude"]
sources:
  - title: "Anthropic: introducing Claude Fable 5 and Claude Mythos 5"
    url: "https://www.anthropic.com/news/claude-fable-5-mythos-5"
    date: 2026-06-09
---

## Table of contents

## The whiteboard from June 2025

I joined Zazmic as Principal ML Engineer in June 2025. In my second week I drew an architecture for a client on a whiteboard. It had eleven agents. Each one had a name and a job. The client loved it. I loved it.

We built four of those eleven. The system works. The other seven would have made it worse.

A year in, I want to write down what I believed then and what I believe now. Not because the old beliefs were stupid. Most of the field held them. But I led the engineers through the year on the basis of some of them, and they cost us time.

## Belief one: more agents means a better system

This is the one the whiteboard shows. In mid-2025 the instinct was to decompose a problem into as many specialists as it had nouns. A research agent, a writing agent, a critique agent, a formatting agent.

What I believe now: every agent boundary is a place where context gets lost. When agent A hands work to agent B, B knows only what A chose to pass. The handoff is a compression step, and compression loses information.

Scout, the marketing intelligence system we built for Let's Forage, has nine agents under one orchestrator. That number is not a design goal. It is what was left after we merged agents whose handoffs kept dropping the thing the next agent needed. The persona agent and the campaign author started as three agents. They became two when we saw the third was mostly re-deriving what the first had already worked out.

The rule I use now: add an agent when the two jobs need different tools, different permissions or different models. Do not add one because the jobs have different names.

## Belief two: the model is the hard part

In June 2025 I spent most of my design time on model selection and prompts. Which Gemini variant for which agent, how to phrase the system instruction, how many examples to include.

What I believe now: the model is maybe a fifth of the work. The rest is tool contracts, state, evaluation and cost. The migration agents we built to move a client's stored procedures onto BigQuery are a good example. The translation step is a model call. The reconciliation step, where a second agent compares row counts and aggregates between source and target, is where the engineering went. The human review gate before cutover is where the trust came from. The model made the project fast. The other parts made it possible.

The clearest sign of this: we have swapped models under running agents several times this year without changing anything else. When Gemini 3 arrived in November, then 3.1 in February, we changed a config value and re-ran the evals. When the model layer is swappable, it is by definition not the hard part.


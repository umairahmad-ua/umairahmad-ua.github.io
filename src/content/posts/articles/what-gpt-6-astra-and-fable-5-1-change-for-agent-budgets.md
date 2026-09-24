---
title: "What Fable 5.1 and cheaper cache reads change for agent budgets"
description: "Anthropic cut cache read prices by 75 percent this week. I re-ran my cost per task model on four production agents. Here is what moved and what did not."
pubDatetime: 2026-09-02T15:00:00Z
kind: article
tags: ["claude", "agents", "infra", "evals"]
sources:
  - title: "Anthropic releases Claude Fable 5.1 and Claude Mythos 5.1"
    url: "https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads"
    date: 2026-09-01
  - title: "Google Gemini 3.8 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-09-02
diagram:
  caption: "How a cache read price cut flows through a cached prefix into cost per task and then into the routing decision."
  nodes:
    - { id: "price", label: "Fable 5.1 cache read cut", col: 0, kind: "source" }
    - { id: "volatile", label: "Alert and recent results", col: 0, kind: "source" }
    - { id: "prefix", label: "Stable cached prefix", col: 1, kind: "store" }
    - { id: "call", label: "Claude agent step cost", col: 2, kind: "model" }
    - { id: "gemini", label: "Gemini Flash steps", col: 2, kind: "model" }
    - { id: "cpt", label: "Cost per task dashboard", col: 3, kind: "store" }
    - { id: "evals", label: "Re-run eval sets", col: 3, kind: "tool" }
    - { id: "routing", label: "Routing table re-priced", col: 4, kind: "tool" }
    - { id: "team", label: "Quarterly re-pricing review", col: 4, kind: "human" }
    - { id: "decision", label: "Move steps or hold", col: 5, kind: "output" }
  edges:
    - ["price", "prefix", "75 pct cheaper reads"]
    - ["prefix", "call", "88 pct of ops input"]
    - ["volatile", "call", "full rate"]
    - ["call", "cpt", "ops 100 to 41"]
    - ["gemini", "cpt", "no change this week"]
    - ["cpt", "routing"]
    - ["evals", "routing", "scores within noise"]
    - ["routing", "team"]
    - ["team", "decision", "re-baseline first"]
---

## Table of contents

## Tuesday morning

Anthropic released [Fable 5.1](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) on Tuesday. The headline for most people was the model. The headline for me was one line in the pricing section. Cache reads on Fable are 75 percent cheaper than they were.

I have written before about cost per task as the number that decides whether an agent survives. This week I got to test whether a pricing change at the vendor moves that number in practice. I re-ran the model on four agents we run in production. Two are Claude based. Two are Gemini based and act as a control.

## What a cache read is, in agent terms

Every agent call carries context. The system prompt, the tool definitions, the policies, the retrieved documents, the conversation so far. Most of that context is identical from one call to the next within a session. Prompt caching lets the provider store the identical prefix and charge less for reading it back.

For an agent, the cached prefix is usually large. Our ops agent carries twenty six playbook definitions and a long policy document on every call. That prefix is over 30,000 tokens. The part that changes per call, the alert and the recent tool results, is a few thousand.

So the cost of a step is roughly: prefix tokens at the cache read rate, plus new tokens at the full rate, plus output tokens. When the cache read rate falls by three quarters, the prefix cost falls by three quarters. Whether that matters depends on the ratio of prefix to new tokens.

## The four agents

Here is what the re-run showed. The numbers are indexed to each agent's cost per completed task in August, so 100 is last month.

| Agent | Model family | Prefix share of input tokens | Cost per task, indexed |
|---|---|---|---|
| Cloud ops agent | Claude | 88 percent | 41 |
| Insurer policy interpreter | Claude | 62 percent | 63 |
| Scout campaign author | Gemini | 71 percent | 100 |
| Migration validator | Gemini | 45 percent | 100 |

The ops agent's cost per task fell by more than half. Its prefix is huge and its output is short. That is the best case for a cache price cut.

The policy interpreter fell by about a third. It carries long policy documents but also long claim files that differ per task, so the prefix share is lower.

The Gemini agents did not move, because nothing changed on that side this week. Google released [Gemini 3.8 Flash](https://en.wikipedia.org/wiki/Gemini_(language_model)) today, and I will re-run when we have it in evals, but the pricing did not shift.

## What did not change

The eval scores. I want to say this plainly because it is the part people skip. Fable 5.1 scored within noise of Fable 5 on both Claude agents' eval sets. The ops agent went up one point on playbook selection. The policy interpreter was flat.

That is fine. I was not looking for a smarter model this week. I was looking at whether a price change at the vendor turns into a cost change for the client without any engineering. It did, and the reason it did is that we built for caching a year ago. Stable prefixes, volatile content at the end, tool definitions that do not change per call.

If your prompts interleave stable and volatile content, the cache does not help you and neither does the price cut. The architecture decision from last year is what made this week's news useful.

## Re-pricing the routing decisions

The bigger effect is on routing. In the multi-model article I described how we send cheap steps to Flash models and judgment steps to frontier models. That split was made with cost per step in mind.

At the new cache read price, two steps in the insurer pipeline that we had routed to Gemini Flash for cost reasons are now cheaper on Fable 5.1 with caching than on Flash without it. The prefix for those steps is the full policy document, which is exactly what caching rewards.

I have not moved them yet. The eval sets for those steps were built with Flash in mind and I want to re-baseline before switching. But the routing table is no longer settled, and I expect it to change every quarter from now on. That is a maintenance cost I did not plan for a year ago. Model prices are now an input to architecture on a monthly basis.

## What I tell clients

Three things.

First, the cost per task number in your dashboard should move when vendor prices move. If it does not, the architecture is not taking advantage of pricing structure, and that is a design problem, not a procurement one.

Second, do not switch models on price alone. Re-run the evals. A model that is 40 percent cheaper and 5 percent worse on your task may or may not be a good trade. The eval tells you. The price sheet does not.

Third, budget engineering time for routing changes. Once a quarter, someone on the team should re-price every step against current rates and propose moves. It is a half day of work and it has paid for itself every time we have done it.

## The quiet part

The reason this week mattered is not that a model got cheaper. Models get cheaper every month. It is that a specific pricing lever, cache reads, moved by a specific large amount, and the agents that were built to use that lever benefited immediately with no code change.

Architecture is a bet on which things will get cheaper. This week one of those bets paid.

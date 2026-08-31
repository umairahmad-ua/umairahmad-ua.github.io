---
title: "What Fable 5.1 and cheaper cache reads change for agent budgets"
description: "Anthropic cut cache read prices by 75 percent this week. I re-ran my cost per task model on four production agents. Here is what moved and what did not."
pubDatetime: 2026-09-02T15:00:00Z
kind: article
theme: evals
tags: ["claude", "agents", "infra", "evals"]
sources:
  - title: "Anthropic releases Claude Fable 5.1 and Claude Mythos 5.1"
    url: "https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads"
    date: 2026-09-01
  - title: "Google Gemini 3.8 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-09-02
---

## Table of contents

## Tuesday morning

Anthropic released [Fable 5.1](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) on Tuesday. The headline for most people was the model. The headline for me was one line in the pricing section. Cache reads on Fable are 75 percent cheaper than they were.

I have written before about cost per task as the number that decides whether an agent survives. This week I got to test whether a pricing change at the vendor moves that number in practice. I re-ran the model on four agents we run in production. Two are Claude based. Two are Gemini based and act as a control.

## What a cache read is, in agent terms

Every agent call carries context. The system prompt, the tool definitions, the policies, the retrieved documents, the conversation so far. Most of that context is identical from one call to the next within a session. Prompt caching lets the provider store the identical prefix and charge less for reading it back.

For an agent, the cached prefix is usually large. Our ops agent carries twenty six playbook definitions and a long policy document on every call. That prefix is over 30,000 tokens. The part that changes per call, the alert and the recent tool results, is a few thousand.

So the cost of a step is roughly: prefix tokens at the cache read rate, plus new tokens at the full rate, plus output tokens. When the cache read rate falls by three quarters, the prefix cost falls by three quarters. Whether that matters depends on the ratio of prefix to new tokens.


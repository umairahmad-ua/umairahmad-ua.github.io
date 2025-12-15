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


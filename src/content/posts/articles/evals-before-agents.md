---
title: "Evals before agents: the LLM-as-judge harness I run in CI"
description: "How my team gates every prompt and tool change behind scenario cases, a rubric-driven judge, retrieval metrics and a human review of disagreements."
pubDatetime: 2025-11-23T15:00:00Z
kind: article
theme: evals
tags: ["evals", "agents", "gcp"]
sources:
  - title: "Introducing Claude Sonnet 4.5"
    url: "https://www.anthropic.com/news/claude-sonnet-4-5"
    date: 2025-09-29
  - title: "Gemini 3 collection"
    url: "https://blog.google/products-and-platforms/products/gemini/gemini-3-collection/"
    date: 2025-11-18
---

An engineer on my team opened a pull request last week that changed one sentence in the campaign author prompt. The diff was eleven words. CI ran for six minutes and failed. Groundedness on the refusal cases had dropped from 0.96 to 0.81. The new sentence made the agent more eager to help, and eager agents cite things that are not there.

Eleven words. Nobody would have caught it in review. The harness caught it in six minutes.

This post is about that harness. It is not clever. It is the least clever thing we run, and it is the reason I sleep.

## Table of contents

## The rule

No prompt, tool description, tool schema, model swap or retrieval config change reaches production without passing the eval suite for every agent it touches. That is the whole rule. It is enforced in CI, not in code review, because code review does not run the agent.

I brought this habit from Developers Inc. The medical claims system there had an active learning loop: flagged claims went to reviewers, corrections came back as training data, and the model retrained weekly. We never let a retrained model out without scoring it on a held-out set first. The agent harness is the same idea with a different scorer.


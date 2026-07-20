---
title: "Evaluating agents with production traffic: shadow runs and replays"
description: "Curated eval sets stop finding bugs after a few months. Replaying real sessions against a candidate agent finds them again. Here is how we do it without spending a fortune."
pubDatetime: 2026-07-22T15:00:00Z
kind: article
theme: evals
tags: ["evals", "agents", "gcp"]
sources:
  - title: "Google Gemini 3.6 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-07-21
---

## Table of contents

## When the eval set stopped finding things

Our eval suite for Scout has run in CI since late 2025. Every prompt and tool change gets scored against a fixed set of scenario cases. It caught a lot in the first six months.

By spring it was catching less. Not because the agent was perfect. Because the eval set was a snapshot of what we thought users would do in November, and users had moved on. The marketing teams using Scout were asking longer questions, chaining requests across sessions, and pasting in data formats we had never seen.

The curated set had become a regression test. A useful one. But a regression test only tells you that you have not broken what you already knew about.


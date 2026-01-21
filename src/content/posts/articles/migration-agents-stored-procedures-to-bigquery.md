---
title: "Migration agents: translating a decade of stored procedures to BigQuery"
description: "How we used a translation agent, a validation agent and a human gate to move thousands of legacy SQL objects onto BigQuery without breaking finance close."
pubDatetime: 2026-01-25T15:00:00Z
kind: article
theme: industry
featured: true
tags: ["agents", "gcp", "infra"]
sources:
  - title: "Google Cloud: Gemini Enterprise launch"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
  - title: "Google: Gemini 3 collection"
    url: "https://blog.google/products-and-platforms/products/gemini/gemini-3-collection/"
    date: 2025-11-18
  - title: "Google: Gemini 3 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2025-12-17
---

The client's finance close runs on the last three working days of every month. It has run on the same SQL Server estate for over a decade. Thousands of stored procedures, SSIS packages and reporting views feed it. Nobody on the current team wrote most of them. Some of the authors have retired. The mandate we received in the autumn was simple to say and hard to do. Move all of it onto BigQuery, and do not miss a close.

This is the kind of project where an LLM looks like a miracle on day one and a liability on day thirty. I want to write down how we structured the work so the miracle part stayed and the liability part did not.

## Table of contents

## The shape of the problem

A migration like this has three kinds of objects. Stored procedures that transform data. Scheduled jobs that decide when things run and in what order. Reports and views that the business reads. Each kind fails differently when translated badly.

A bad procedure translation gives you wrong numbers. A bad job translation gives you right numbers on the wrong day. A bad view translation gives you a dashboard that loads but shows a column with a different meaning. The last one is the most dangerous because it looks fine.

So the design goal was never "translate SQL". The design goal was "prove that each translated object produces the same answer as the source, and keep proving it until the business signs off".

## Three agents and one human

We built the pipeline around three narrow agents and a human approval step. Each agent has one job, one set of tools and one output format. None of them can write to the target project on its own.

The translation agent takes a legacy object and its dependencies and produces BigQuery SQL. It runs on Gemini 3 Pro, which Google released in November. It sees the source text, the schema of every table it touches, and a style guide we wrote for the target. It returns the translation plus a list of assumptions it made. The assumptions list turned out to be the most valuable part of its output.

The validation agent takes the source object and the translated object and writes reconciliation queries. Row counts, sums of every numeric column, distinct counts of every key, and min and max of every date. It runs those against both systems for a fixed sample of business dates and reports the deltas. It does not decide if a delta is acceptable. It reports.

The documentation agent reads the source, the translation and the validation report and writes a lineage entry. Which tables feed this object, which objects read from it, what changed in the translation and why. This is the file the finance team reads. It is also the file a future engineer reads when something breaks at two in the morning.

Then a person looks at all three outputs and approves or rejects the cutover batch. Nothing goes live without that click.


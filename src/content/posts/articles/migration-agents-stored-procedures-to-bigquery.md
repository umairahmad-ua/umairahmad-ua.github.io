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


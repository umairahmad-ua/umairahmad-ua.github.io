---
title: "Nine agents, one orchestrator: how Scout is structured"
description: "The real architecture of the multi-agent marketing intelligence system my team runs for the Let's Forage platform, and the parts that were hard."
pubDatetime: 2025-10-26T15:00:00Z
kind: article
theme: structure
featured: true
tags: ["agents", "adk", "gcp", "rag"]
sources:
  - title: "Introducing Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
  - title: "LangChain 1.0 and LangGraph 1.0 generally available"
    url: "https://changelog.langchain.com/announcements/langchain-1-0-now-generally-available"
    date: 2025-10-22
---

A brand strategist opens a dashboard full of short-form video trends and asks one question. "Which of these matters for our spring launch, and what would a campaign look like?" The dashboard cannot answer that. It has the data. It has no opinion.

Scout is the system my team built to sit next to that dashboard and have the opinion. This is how it is put together. I am writing it down because most multi-agent write-ups describe a demo, and this one has been in production for a while with real marketers from brands like Apple, Sephora and Mondelez asking it real questions.

## Table of contents


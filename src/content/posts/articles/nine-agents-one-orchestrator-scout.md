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

## What Scout is for

Let's Forage is a cultural-intelligence platform. It analyzes short video across TikTok, Instagram and YouTube Shorts, then turns what it finds into campaign material. It plugs into Meta's ads ecosystem on the delivery side. Zazmic built the platform on Google Cloud. Scout is the conversational layer on top.

The job is narrow on purpose. Scout answers questions about the client's own trend data, drafts campaign ideas grounded in that data, and explains the platform to new users. It does not browse the web. It does not make things up about competitors. When a question falls outside those three jobs, it says so.

## The agent tree

Scout runs as a FastAPI service built on Google's Agent Development Kit and deployed on Vertex AI Agent Engine. Every agent runs Gemini 2.0 Flash by default, and the model is configurable per agent. Here is the tree.

```
root_agent (response_agent)
├── data_analysis_agent          Sequential
│   ├── research_assistant_agent   pulls numbers from the dashboard data
│   └── research_author_agent      turns the numbers into a finding
├── big_idea_agent                 one campaign concept, argued
├── campaign_author_agent          full campaign brief from a concept
├── general_strategy_agent         positioning and channel advice
├── persona_agent                  audience personas from trend clusters
├── role_author_agent              role-specific rewrites (CMO, creative, media)
└── help_desk_agent                how the platform works
```

Nine agents. One root, seven specialists, and one of the specialists is itself a pair.


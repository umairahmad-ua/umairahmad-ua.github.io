---
title: "Grounding marketing claims in first-party data: how Scout cites"
description: "Marketing agents love to generalize. Here is how Scout, our agent system for Let's Forage, ties every insight to the client's own dashboard data or refuses."
pubDatetime: 2025-10-29T15:00:00Z
kind: article
theme: tools
tags: ["rag", "agents", "gcp", "evals"]
sources:
  - title: "LangChain 1.0 and LangGraph 1.0 GA"
    url: "https://changelog.langchain.com/announcements/langchain-1-0-now-generally-available"
    date: 2025-10-22
---

## Table of contents

## The sentence that got us in trouble

Early in Scout's life, the strategy agent wrote this for a brand marketer: "Gen Z audiences respond 40 percent better to unpolished creative." It sounded right. It was in the general direction of things the model had read. It had nothing to do with the client's data, and the client's team lead noticed in the first review.

Scout is the multi-agent marketing intelligence system my team built for the Let's Forage platform. The people using it work on brands like Apple and Sephora. They have their own dashboards, their own campaign data, and their own reasons for not trusting a number they cannot trace. That one sentence cost us a week of credibility.

The fix became a design principle. Every quantitative claim in a Scout answer is either grounded in the client's first-party data with a citation, or it is not made.

## What first-party data looks like here

Let's Forage analyzes short-form video across platforms and gives brand teams a dashboard of cultural signals. Trends, creators, formats, engagement by audience segment. Scout's job is to answer questions about that dashboard and turn the answers into campaign ideas.

The data the agents may cite:

- Dashboard metrics for the client's own brand and tracked competitors
- Campaign performance the client has connected, including Meta ads data
- Trend and creator analyses the platform has computed for that client

Not on the list: anything the model knows from training. General marketing wisdom is allowed as framing. It is not allowed as a number.


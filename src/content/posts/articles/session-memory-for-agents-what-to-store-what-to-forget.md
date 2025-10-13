---
title: "Session memory for agents: what to store and what to forget"
description: "Agents need memory to be useful and forgetting to be safe. How my team designs session state, summaries, and retention for enterprise agents on Google Cloud."
pubDatetime: 2025-10-15T15:00:00Z
kind: article
theme: structure
tags: ["agents", "adk", "gcp", "security"]
sources:
  - title: "Google Cloud launches Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
---

## Table of contents

## The two complaints

Users of a new agent complain about memory in two opposite ways within the first week. It forgot what I said three messages ago. It remembered something I told it last month and I did not expect that.

Both are design failures. The first is a context problem. The second is a policy problem. My team has now built session memory for a marketing intelligence agent, a supply chain planner, and a healthcare reviewer's assistant. The patterns are the same across all three. This is what we settled on.


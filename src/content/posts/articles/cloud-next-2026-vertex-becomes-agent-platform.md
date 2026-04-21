---
title: "Notes from Google Cloud Next 2026: Vertex AI becomes the Gemini Enterprise Agent Platform"
description: "What last week's Cloud Next announcements mean for a team running multi-agent systems on Vertex AI Agent Engine, and what to adopt now versus wait on."
pubDatetime: 2026-04-26T15:00:00Z
kind: article
theme: platform
tags: ["gcp", "agents", "adk"]
sources:
  - title: "Google Cloud Next 2026 wrap-up"
    url: "https://cloud.google.com/blog/topics/google-cloud-next/google-cloud-next-2026-wrap-up"
    date: 2026-04-24
  - title: "HPCwire: Google unveils Gemini Enterprise Agent Platform"
    url: "https://www.hpcwire.com/aiwire/2026/04/23/google-unveils-gemini-enterprise-agent-platform/"
    date: 2026-04-23
  - title: "Google Open Source: a year of A2A"
    url: "https://opensource.googleblog.com/2026/04/a-year-of-open-collaboration-celebrating-the-anniversary-of-a2a.html"
    date: 2026-04-09
  - title: "Google Developers: why we built ADK 2.0"
    url: "https://developers.googleblog.com/why-we-built-adk-20/"
    date: 2026-03-26
  - title: "Google Cloud: introducing Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
---

Cloud Next ran April 22 to 24 in Las Vegas. I did not go. I watched the keynotes from Houston with two of my engineers on a call and a shared document open. By Thursday evening the document had forty lines of "what does this mean for us". This post is the cleaned-up version.

For context, my team runs Scout, a multi-agent marketing intelligence system for Let's Forage, on Vertex AI Agent Engine. We built it on Google's Agent Development Kit last summer. Clients of that platform include teams at Apple and Meta. When Google renames the thing our production system sits on, I pay attention.


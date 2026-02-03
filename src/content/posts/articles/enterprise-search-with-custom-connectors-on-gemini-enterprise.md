---
title: "Enterprise search with custom connectors on Gemini Enterprise"
description: "How my team built permission-aware search for a wealth management firm: MCP connectors into CRM, SharePoint and BigQuery, citations on every answer, and an eval harness that runs before anything changes."
pubDatetime: 2026-02-04T15:00:00Z
kind: article
theme: tools
tags: ["rag", "gcp", "agents", "evals"]
sources:
  - title: "Google Cloud launches Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
  - title: "OpenAI Codex app for macOS"
    url: "https://openai.com/index/introducing-the-codex-app/"
    date: 2026-02-02
---

## Table of contents

## The question that started it

A wealth management firm asked us a simple question in December. An advisor gets a call from a client. She needs to know the client's risk profile, the last three conversations, the current policy on a product, and the account balance. Today that is four systems and about eleven minutes. Can an agent answer in one place, and can it be trusted not to show her something she is not cleared to see.

The second half of that question is the whole project. Search is easy. Permission-aware search with citations is the work.


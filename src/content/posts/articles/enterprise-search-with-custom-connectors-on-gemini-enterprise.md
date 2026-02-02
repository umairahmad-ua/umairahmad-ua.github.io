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

## Why we chose Gemini Enterprise over building retrieval ourselves

My default for enterprise RAG has been the blueprint I wrote about last year. Ingestion, hierarchical chunking, hybrid retrieval, reranking, cited generation. We own every piece. For this client I chose [Gemini Enterprise](https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise) instead, for two reasons.

First, access control. The firm has document-level permissions in SharePoint and record-level permissions in the CRM. Rebuilding that ACL model inside my own vector store is a project on its own, and it is a project where a single bug is a compliance incident. Gemini Enterprise carries source permissions through to retrieval. The advisor only sees results she could already open.

Second, the connector model. The platform expects you to plug in data sources rather than copy data out of them. That matched how the compliance team already thinks. Data stays where it lives. The agent visits.

The trade is control. I cannot tune the chunking strategy the way I can in my own pipeline. I accepted that for a client whose first requirement was "never show the wrong thing to the wrong person."


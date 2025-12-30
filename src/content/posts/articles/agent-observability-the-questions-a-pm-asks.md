---
title: "Agent observability: traces, spans and the questions a PM asks"
description: "What we log for every agent run, how OpenTelemetry GenAI conventions and Langfuse fit together, and the five questions a product manager asked that our traces could not answer."
pubDatetime: 2025-12-31T15:00:00Z
kind: article
theme: evals
tags: ["agents", "infra", "evals"]
sources: []
---

## Table of contents

## The question that broke our dashboards

In October a product manager at a media client asked me a plain question. "Why did the campaign draft for the Tuesday brief cost four times the Monday one?"

We had dashboards. Latency by agent. Tokens by model. Error rate by hour. None of them could answer her question. We could see that Tuesday cost more. We could not see why, because the spend was spread across nine agents and forty tool calls and our logs were flat lines with a timestamp and a message.

That question is the reason we rebuilt observability for every agent my team runs. This is what we log now, how the pieces fit, and the questions we can answer as a result.


---
title: "Incident postmortem: the day an agent retried itself into a bill"
description: "A tool timeout, a retry policy that looked reasonable, and an agent that spent a week of budget in forty minutes. What we changed."
pubDatetime: 2026-06-24T15:00:00Z
kind: article
theme: evals
tags: ["agents", "infra", "evals"]
sources:
  - title: "Amazon Bedrock AgentCore Harness generally available"
    url: "https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-bedrock-agentcore-harness-generally-available/"
    date: 2026-06-17
---

## Table of contents

## What happened

On a Tuesday in June, at 2:14 in the afternoon Houston time, a document intake agent for a healthcare client started failing a tool call. The tool was a wrapper around the client's claims lookup API. The API was slow, not down. Responses came back after twelve seconds instead of two. Our tool had a ten second timeout.

The agent did what we told it to do. It retried. The retry policy was three attempts with exponential backoff. That is a sane policy for a stateless HTTP call. It is not a sane policy for a step inside a reasoning loop, because the agent also had its own instruction to try alternative approaches when a tool failed.

So the model tried the tool. The tool timed out three times. The model then reasoned that the lookup was unavailable, rewrote the query with a different member identifier format, and called the tool again. Three more timeouts. Then it tried a different tool, a broader search, which also depended on the same slow API. Three more. Then it went back to the first tool with a third identifier format.

Every attempt carried the full context window. Every attempt was a paid model call. Every attempt appended more failure text to the context, which made the next attempt longer and more expensive.

The intake queue kept feeding it new documents. Each document went through the same loop. By 2:55 our cost dashboard alert fired. By the time an engineer killed the deployment at 2:58, the agent had spent what we normally spend in a week. The client's API had recovered on its own at 2:40. The agent was still burning money on documents it had queued during the slow period.

Nobody's data was harmed. No wrong decision reached a human. The system was safe. It was also stupid, and the stupidity cost real money.


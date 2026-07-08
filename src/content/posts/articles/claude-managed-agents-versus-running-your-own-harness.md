---
title: "Claude Managed Agents versus running your own harness"
description: "Three months with Managed Agents in public beta. Where I let Anthropic run the loop, where I still run it myself, and how I decide."
pubDatetime: 2026-07-08T15:00:00Z
kind: article
theme: platform
tags: ["claude", "agents", "infra"]
sources:
  - title: "Anthropic launches Claude Managed Agents (public beta)"
    url: "https://claude.com/blog/claude-managed-agents"
    date: 2026-04-08
  - title: "xAI Grok 4.5"
    url: "https://x.ai/news/grok-4-5"
    date: 2026-07-08
---

## Table of contents

## The question a client asked

In May a financial services client asked me a question I could not answer well on the spot. "Why are you running the agent loop yourselves? Anthropic will run it for you now."

They were referring to Claude Managed Agents, which went into public beta in April. The pitch is simple. You define the agent, its tools and its instructions. Anthropic runs the loop, the sandbox, the retries and the session state. You get an endpoint.

I told the client I would come back with a real answer. This is the real answer, three months and four deployments later.

## What Managed Agents actually takes off your plate

The loop. That sounds small until you have written one. A production agent loop handles tool dispatch, tool timeouts, malformed tool output, context window management, retries, session persistence, streaming, and cancellation. The harness we run for Scout is about four thousand lines, and most of it is that list.

The sandbox. When an agent runs code or shells out, something has to isolate it. We use Cloud Run jobs with a locked-down service account. Managed Agents gives you an isolated execution environment per session without that setup.

Session state. Memory across turns, across days, with a defined retention. We built this on Firestore. It works. It is also a thing we maintain.

Model upgrades. When a new Claude model lands, a managed agent can move to it with a configuration change. We do the same thing in our harness, but we own the eval run that proves it is safe.

## What it does not take off your plate

Evaluation. Managed Agents runs your agent. It does not tell you whether the agent is good. Our eval suite, judge model and CI gates are unchanged whether the loop runs in our harness or theirs.

Tool quality. The agent calls the tools you give it. A tool with a vague schema and a chatty error message is a bad tool in either place.

Cost attribution. We trace cost per completed task per agent. With our harness that is a middleware. With Managed Agents it is reading their usage data and joining it to our task identifiers. Doable, but it took a week to get right.

Data residency and approvals. Two of our clients require that agent execution stays in specific regions and that a human approval step lives inside their own systems. Managed Agents was not the right fit for those at the time we evaluated it.


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


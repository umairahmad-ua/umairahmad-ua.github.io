---
title: "Claude Managed Agents versus running your own harness"
description: "Three months with Managed Agents in public beta. Where I let Anthropic run the loop, where I still run it myself, and how I decide."
pubDatetime: 2026-07-08T15:00:00Z
kind: article
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

## Where I use each

Here is the decision as my team applies it today.

**Managed Agents when:**

- The agent is mostly reasoning plus a handful of well-behaved tools.
- The client is fine with Anthropic hosting execution.
- We want the fastest path from a working prompt to an endpoint.
- The agent will change models often and we want that to be a config change.

We moved an internal research assistant and a client-facing document summarizer to Managed Agents. Both were harness-heavy for no good reason. The move cut the code we maintain for them by more than half and the endpoints have been quieter than the ones we ran.

**Our own harness when:**

- The agent orchestrates other agents on a different platform. Scout lives on the Gemini Enterprise Agent Platform. Its Claude-backed sub-agent runs in our harness because the orchestration has to stay in one place.
- Execution has to happen inside a client's network or region.
- A human approval gate must be a client-owned system, not a callback.
- Cost tracing has to be at the tool call level, not the session level.

The cloud operations agent stays in our harness for all four reasons. It reads alerts, pulls logs through MCP tools, and executes only inside approved playbooks. The permission model is the product. I am not moving that to anyone else's runtime.

## A concrete comparison

Take the document summarizer we moved. Before, the stack was:

```
Cloud Run service (FastAPI)
  └── our harness (loop, retries, streaming)
        ├── Claude via API
        ├── Firestore for session state
        ├── Cloud Storage for documents
        └── our tracing middleware to BigQuery
```

After:

```
Managed Agent (Anthropic runs loop, sandbox, state)
  ├── tools: fetch_document, redact_pii, store_summary  (our MCP server on Cloud Run)
  └── usage export -> BigQuery join on task_id
```

Our code went from a service plus a harness to an MCP server with three tools. The tools were the part with actual business logic. The rest was plumbing we had written because there was nothing to buy.

## The trade-off I still watch

Control over the loop is also control over failure behavior. When our incident in June turned a slow API into a retry storm, we fixed it by changing the loop. With a managed loop I would have been changing tool behavior and instructions instead, and waiting on the platform for anything deeper. That is not a reason to avoid Managed Agents. It is a reason to keep at least one agent in our own harness so my team keeps the muscle.

## An aside on model choice

xAI released Grok 4.5 today. I mention it because the client who asked the original question also asked whether Managed Agents locks them into Claude. It does, in the sense that the runtime is Anthropic's. Our harness runs Gemini, Claude and open models behind the same tool layer. If model portability matters to a client, that is a fifth reason for our harness, and I now say so up front.

## The answer I gave the client

Run the loop yourself when the loop is the product. Let Anthropic run it when the loop is plumbing. For most enterprise agents I see, the loop is plumbing and the tools are the product. For the ones where it is not, you will know, because the compliance team will tell you.

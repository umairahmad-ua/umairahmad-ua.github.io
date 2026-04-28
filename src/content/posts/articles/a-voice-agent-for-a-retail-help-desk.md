---
title: "A voice agent for a retail help desk on Gemini Live"
description: "Order lookups, returns and store hours over the phone. Barge-in, latency budgets and escalation were the work. The model was not."
pubDatetime: 2026-04-29T15:00:00Z
kind: article
theme: industry
tags: ["agents", "gemini", "gcp"]
sources:
  - title: "Google Cloud Next 2026 wrap-up"
    url: "https://cloud.google.com/blog/topics/google-cloud-next/google-cloud-next-2026-wrap-up"
    date: 2026-04-22
  - title: "OpenAI GPT-5.5"
    url: "https://techcrunch.com/2026/04/23/openai-chatgpt-gpt-5-5-ai-model-superapp/"
    date: 2026-04-23
---

## Table of contents

## Four hundred calls a day about the same six things

A regional retail chain came to us with a help desk problem. About four hundred calls a day. Six questions covered most of them. Where is my order. Can I return this. Is the store open. Do you have this in stock. Reset my loyalty password. Cancel my order.

The human agents were good at the other calls, the ones where a customer was upset or the situation was unusual. They spent most of their day on the six boring ones. The client did not want to replace the humans. They wanted the humans to get the interesting calls.

My team built a voice agent. Here is what took the time.

## The stack

Telephony comes in through the client's existing provider and streams audio to a Cloud Run service. The service holds a session with Gemini Live, which handles speech in and speech out with low latency. The agent logic sits on Google ADK with a small set of tools. Order lookup against the order management API. Returns eligibility against the policy engine. Store hours from a Firestore document. Inventory from the product API. Loyalty account operations behind a verification step. Transfer to a human queue.

Every call is transcribed and stored in BigQuery with the tool calls and timings. That store is the eval set and the debugging log.

## Barge-in is not optional

People interrupt phone systems. They always have. If the agent is reading store hours and the customer says "no, the one on Main Street," the agent has to stop and listen.

Gemini Live handles the audio side of this. The agent logic has to handle the state side. When the customer barges in, whatever the agent was saying is now unsaid. If it was halfway through confirming a return, the return is not confirmed. We keep a small state machine per call and every spoken confirmation writes to it only when the utterance completes.

This sounds obvious. Our first version confirmed a cancellation that the customer had interrupted to say "wait, not that one."

## The latency budget

A phone conversation has a rhythm. If the agent takes more than about a second and a half to respond, people start saying "hello?" and the call falls apart.

Speech in and out is fast. The tool calls are the problem. The order management API takes six hundred milliseconds on a good day. Inventory takes longer.

So every tool has a budget, and the agent talks while it waits.

```python
TOOL_BUDGETS_MS = {
    "lookup_order": 800,
    "check_inventory": 1200,
    "returns_eligibility": 600,
    "store_hours": 100,
}

async def call_with_filler(tool, args, say):
    task = asyncio.create_task(tool(**args))
    try:
        return await asyncio.wait_for(asyncio.shield(task), TOOL_BUDGETS_MS[tool.__name__] / 1000)
    except asyncio.TimeoutError:
        await say("Let me check that for you.")
        return await task
```

The filler line buys another two seconds. If the tool has not returned by then, the agent says so honestly and offers to text the answer. Customers accept that. They do not accept silence.


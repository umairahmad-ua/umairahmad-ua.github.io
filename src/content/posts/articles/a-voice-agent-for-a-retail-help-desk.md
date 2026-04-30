---
title: "A voice agent for a retail help desk on Gemini Live"
description: "Order lookups, returns and store hours over the phone. Barge-in, latency budgets and escalation were the work. The model was not."
pubDatetime: 2026-04-29T15:00:00Z
kind: article
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

## Escalation that does not feel like failure

The agent hands off to a human in three cases. The customer asks for one. The customer sounds upset, which Gemini flags from tone and word choice. The agent has tried twice and not resolved the question.

The handoff carries context. The human sees the transcript, the tool results and a one-line summary before they pick up. The customer does not repeat themselves. That single detail did more for satisfaction scores than anything about the voice.

We also decided the agent never says "I am an AI" unprompted and never pretends otherwise when asked. It introduces itself as the store's automated assistant. Customers know. The honesty costs nothing.

## Evaluating on transcripts

The eval set is real calls, de-identified, with the outcome labeled by the client's team. Did the agent answer correctly. Did it escalate when it should have. Did it fail to escalate when it should have. How long did the call take.

A judge model scores transcripts on a rubric, and a sample goes to human review every week. The metric the client watches is containment, the share of calls the agent resolves without a human. The metric I watch is wrong-containment, calls the agent closed that should have gone to a person. That number has to stay near zero even if containment suffers.

After six weeks, containment is a little over half of calls. Wrong-containment is under two percent, and every one of those is reviewed. Average handle time on the calls that do reach a human went up, which is correct. The humans are getting the hard ones.

## The order that was not there

The worst call in week three came from a customer who read out an order number that did not exist. The lookup tool returned an empty result. The agent apologized and asked for the number again. The customer read it again. Same result. The agent asked a third time. The customer hung up.

The transcript looked polite. The customer experience was a loop. Nothing in the eval set had covered a lookup that legitimately fails twice.

The fix had three parts. The lookup tool now returns a typed reason with the empty result. Not found, malformed number, or backend timeout. Each reason has its own next step written into the state machine. Not found once means ask for the email on the order instead. Not found twice means hand off to a human with the numbers the customer tried. A timeout means say so and offer a callback.

Second, we added a retry counter to session state. Any tool that fails twice for the same intent forces an escalation. The agent cannot ask a third time. The rule is in code, not in the prompt, because a prompt can be talked out of a rule and a counter cannot.

Third, we built twelve new transcript cases around failing lookups. Wrong number, right number with a typo, number from a different retailer, a number for an order older than the retention window. Each case has an expected path through the state machine and an expected final action. The judge scores whether the agent reached the right action, not whether it sounded nice getting there.

Since the fix, the loop has not recurred. Escalations on failed lookups went up, which is the point. A human with two attempted order numbers and an email address resolves those calls in under two minutes. The agent trying a third time resolved none of them.

## What Cloud Next changed

I followed [Cloud Next](https://cloud.google.com/blog/topics/google-cloud-next/google-cloud-next-2026-wrap-up) last week from Houston. The Gemini Enterprise Agent Platform going GA affects this project directly. Our agent runs on Agent Engine today. The migration to the renamed platform is on the list, and I will write about it when it is done.

OpenAI's [GPT-5.5](https://techcrunch.com/2026/04/23/openai-chatgpt-gpt-5-5-ai-model-superapp/) arrived the same week. For a voice agent, the model matters less than the latency and the tool discipline. A smarter model that takes two seconds to answer is a worse phone agent than a decent one that answers in one.

## The lesson

The client thought they were buying a model that could talk. They were buying a state machine, a latency budget and a handoff process, with a model doing the talking. That is true of most agent projects. It is just more obvious on the phone.

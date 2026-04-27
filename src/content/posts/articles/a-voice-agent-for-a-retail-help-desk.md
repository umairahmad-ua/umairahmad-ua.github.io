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


---
title: "A fraud triage agent that explains itself to analysts"
description: "Fraud models flag transactions well. Analysts still need to know why. How my team wrapped detection scores in an agent that builds the case file and learns from the analyst."
pubDatetime: 2025-11-12T15:00:00Z
kind: article
theme: industry
tags: ["agents", "evals", "gcp"]
sources:
  - title: "OpenAI releases GPT-5.1"
    url: "https://openai.com/index/gpt-5-1/"
    date: 2025-11-12
---

## Table of contents

## Ninety-four percent is not the problem

A few years ago I built a real-time fraud detection pipeline. Streaming features from Kafka, an ensemble of XGBoost, Isolation Forest and an autoencoder, SageMaker endpoints behind A/B routing. It caught 94 percent of fraud at under 0.1 percent false positives. I was proud of those numbers. I still am.

The analysts who used it were less impressed. Not with the recall. With the queue.

Every flagged transaction landed in a queue as a row with a score. An analyst opened the row, then opened four other systems to understand it. Customer history in one tool. Device fingerprint in another. Merchant records in a third. Previous cases in a shared drive. Twelve minutes per case, most of it copying identifiers between tabs.

The model did its job. The work around the model was untouched.

This year a financial services client came to my team with the same shape of problem. Good models, slow analysts. What follows is how we built a triage agent on top of the models rather than instead of them.

## The models become tools

The first decision was to leave the detection models alone. They work. They have years of tuning behind them and a monitoring stack the client trusts.

The agent does not detect fraud. It explains a detection. The models become tools the agent calls:

```python
tools = [
    score_transaction,      # ensemble score plus per-model components
    top_features,           # SHAP contributions for this transaction
    customer_history,       # last 90 days, summarized
    device_and_session,     # fingerprint, IP reputation, velocity
    merchant_profile,       # category, chargeback rate, age
    similar_past_cases,     # vector search over closed case notes
]
```

Each tool returns a typed result. The agent's job is to call the right ones, assemble a case file, and write the narrative an analyst would otherwise write by hand.

The narrative model is Gemini. The detection models are the same gradient boosting and anomaly models the client already ran. Nothing about the fraud decision changed. What changed is that the analyst opens one screen instead of five.

## What a case file looks like

The output is a structured document, not a chat message. A Pydantic model with fixed sections:

- Summary: two sentences on what was flagged and why.
- Signals: the top contributing features in plain language, with the raw values.
- Context: what is normal for this customer and how this transaction differs.
- Precedent: up to three similar closed cases and how they were resolved.
- Recommendation: block, hold, release, or escalate, with a confidence band.
- Open questions: what the agent could not determine.

The last section is the one analysts told us they read first. An agent that says "I could not verify the device because the fingerprint service timed out" is more useful than one that pretends it knows.

The SHAP values do most of the explanatory work. The model says the transaction is anomalous because the amount is nine times the customer's ninety day median, the merchant category is new for this customer, and the session came from a device first seen four minutes ago. The agent turns those three facts into a paragraph. It does not invent a fourth.

## The hard part was precedent

Scores and features are deterministic. Precedent is retrieval, and retrieval is where the quality lives or dies.

The client had six years of closed cases with free-text analyst notes. We embedded the notes and indexed them alongside structured fields like merchant category and resolution. The agent searches with a hybrid query: dense similarity on the narrative plus filters on category and amount band.

The first version surfaced cases that were textually similar and practically useless. Two cases that both mentioned "gift card" matched even when one was a chargeback dispute and the other was account takeover. We added the resolution type and the fraud typology as required filters, and the reranker started earning its cost.

Precedent is also where the analyst feedback loop pays off. When an analyst marks a surfaced case as "not relevant", that pair goes into the eval set. The retrieval configuration that lowers the not-relevant rate wins.


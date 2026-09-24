---
title: "A fraud triage agent that explains itself to analysts"
description: "Fraud models flag transactions well. Analysts still need to know why. How my team wrapped detection scores in an agent that builds the case file and learns from the analyst."
pubDatetime: 2025-11-12T15:00:00Z
kind: article
tags: ["agents", "evals", "gcp"]
sources:
  - title: "OpenAI releases GPT-5.1"
    url: "https://openai.com/index/gpt-5-1/"
    date: 2025-11-12
diagram:
  caption: "Detection models become tools the Gemini agent calls to build a case file that analysts confirm or correct."
  nodes:
    - { id: "txn", label: "Flagged transaction", col: 0, kind: "source" }
    - { id: "models", label: "XGBoost and autoencoder", col: 1, kind: "model" }
    - { id: "shap", label: "SHAP top features", col: 1, kind: "tool" }
    - { id: "ctx", label: "Customer, device, merchant", col: 1, kind: "tool" }
    - { id: "prec", label: "Closed case notes index", col: 1, kind: "store" }
    - { id: "agent", label: "Gemini triage agent", col: 2, kind: "agent" }
    - { id: "casefile", label: "Typed case file", col: 3, kind: "output" }
    - { id: "analyst", label: "Analyst agrees or disagrees", col: 4, kind: "human" }
  edges:
    - ["txn", "agent"]
    - ["agent", "models", "score"]
    - ["agent", "shap"]
    - ["agent", "ctx"]
    - ["agent", "prec", "hybrid search"]
    - ["agent", "casefile"]
    - ["casefile", "analyst"]
    - ["analyst", "prec", "disagree reasons"]
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

## The feedback loop

Every case file has two buttons at the bottom. Agree with the recommendation. Disagree, with a reason.

Agreement rate is the headline metric for the agent. It is not a fraud metric. The detection models still own recall and false positives. Agreement measures whether the explanation and recommendation match what a trained analyst concludes from the same evidence.

Disagreements are gold. Each one is a labeled example of the agent reasoning badly or missing context. We review them weekly. Some become new tools, like the merchant profile tool that did not exist until analysts kept disagreeing on cases where the merchant's own chargeback rate explained everything.

The corrections also feed the case notes index. An analyst's written reason for disagreeing becomes the note attached to that case. Six months in, the precedent search is better than it was, because the analysts have been teaching it without knowing that is what they were doing.

## What changed for the analysts

Time per case dropped from around twelve minutes to about four. That number came from the client's own queue metrics, not from us. Analysts spend the saved time on the cases the agent marks as escalate, which is where their judgment matters.

Nobody lost the ability to look at raw data. Every section of the case file links to the underlying tool result. Trust came from being able to check, not from being told to trust.

## What I got wrong

I underestimated how much the narrative model would want to conclude. Early prompts produced case files that read as verdicts. "This transaction is fraudulent." The models are not certain enough for that language, and neither is the agent. We rewrote the instruction to require hedged language tied to the confidence band, and we added an eval that fails any case file using unconditional verdict phrasing.

I also assumed analysts wanted less text. They wanted less clicking. The case files are longer than the old queue rows by a lot. Nobody complained about the length. They complained when a section was missing.

## What to copy

If you have a model that works and a queue that does not, do not replace the model. Wrap it. Make the model a tool. Make the case file a typed document with a section for what the agent could not determine. Put two buttons at the bottom and treat every disagreement as a labeled example. Keep every number linked to the raw result so the analyst can check it in one click. The detection numbers will not move. The minutes per case will.

## Aside

OpenAI released [GPT-5.1](https://openai.com/index/gpt-5-1/) today. I read the notes between two review sessions. The models keep getting better at writing. That helps the narrative layer. It does nothing for the retrieval layer, the tool contracts or the feedback loop, which is where most of this project's effort went. The detection models are still XGBoost and an autoencoder. Boring works.

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


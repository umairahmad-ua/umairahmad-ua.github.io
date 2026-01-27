---
title: "Fine-tuning versus prompting for domain extraction in 2026"
description: "Two years ago I fine-tuned for every extraction task. Now I prompt first. A decision table, the eval design that settles it, and the cases where QLoRA still wins."
pubDatetime: 2026-01-28T15:00:00Z
kind: article
theme: platform
tags: ["fine-tuning", "evals", "gcp"]
sources:
  - title: "Moonshot releases Kimi K2.5"
    url: "https://huggingface.co/blog/mlabonne/kimik25"
    date: 2026-01-27
---

## Table of contents

## The question a client asked last week

A financial services client wants to extract structured fields from a few hundred thousand legacy loan documents. Borrower details, terms, covenants, dates. Their engineering lead asked me whether we should fine-tune a model or prompt a frontier one.

Two years ago I would have said fine-tune without thinking. At Developers Inc I fine-tuned BERT for medical codes and QLoRA-tuned Llama 2 and Mistral for domain tasks, and it worked. Today my first answer is prompt, measure, and only then decide. This is the reasoning, and the cases where I still reach for QLoRA.

## What changed

Three things. Context windows grew until a whole document fits with room for a long schema and twenty examples. Structured output became a first-class API feature, so the model returns valid JSON against a schema instead of text you parse and hope. And the price of frontier inference fell far enough that running a large model over a few hundred thousand pages is a line item, not a project.

Open models moved too. [Kimi K2.5](https://huggingface.co/blog/mlabonne/kimik25) came out yesterday as another trillion-parameter open weight release. The gap between what you can prompt and what you can host keeps narrowing from both sides.

Fine-tuning did not get worse. Prompting got good enough for a larger share of tasks, and it is faster to iterate. A prompt change takes an hour and an eval run. A fine-tune takes a data pipeline, a training job on Vertex AI, and a day.

## The decision table

This is what I use. It is not a rule. It is the list of questions that decide.

| Question | Points to prompting | Points to fine-tuning |
|---|---|---|
| How many labeled examples exist | Under a few hundred | Thousands, clean, representative |
| How stable is the schema | Changes monthly | Fixed for a year or more |
| Volume per month | Under a few million pages | Tens of millions, cost dominates |
| Latency requirement | Seconds are fine | Sub-second, on-device or edge |
| Data residency | Frontier API in region is allowed | Weights must run in a private VPC |
| Domain language | Close to general English | Heavy jargon, codes, abbreviations |
| Format of the input | Clean text or PDF | Noisy OCR, forms, scanned layouts |
| Who maintains it | A small team with eval discipline | A team that can run training jobs |

For the loan documents, the first pass points to prompting. A few hundred labeled examples exist. The schema is still being negotiated. Volume is a few hundred thousand pages, once. Frontier models in region are permitted.

## The eval that settles it

The table narrows the choice. The eval decides it. We build the same eval set for both approaches before writing either.

Two hundred documents, held out, labeled by the client's own analysts with a second pass to resolve disagreements. Every field scored as exact match, normalized match, or miss. Per-field precision and recall, not one blended accuracy number. A dollar and a latency figure per document.

Then we run three candidates. A frontier model with schema, instructions and fifteen examples in context. A smaller hosted model with the same prompt. A QLoRA fine-tune of Llama 3 on Vertex AI custom training, using the labeled set minus the held-out two hundred.

The pattern I see across clients in the last year is consistent. The frontier prompt wins on most fields out of the box. The fine-tune wins on the two or three fields with the most domain-specific format. Covenant clauses written in a house style. Internal product codes. Dates written in a way only that institution uses. The smaller hosted model usually loses on both unless the fine-tune is applied to it.


---
title: "Fine-tuning versus prompting for domain extraction in 2026"
description: "Two years ago I fine-tuned for every extraction task. Now I prompt first. A decision table, the eval design that settles it, and the cases where QLoRA still wins."
pubDatetime: 2026-01-28T15:00:00Z
kind: article
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

## Where QLoRA still wins

Four cases where I go straight to fine-tuning.

**Codes and identifiers with internal structure.** Medical codes, part numbers, ledger codes. A model that has seen thousands of them learns the structure. A prompt with fifteen examples does not.

**Noisy OCR at volume.** Scanned forms with checkbox marks, handwriting and skew. A fine-tune on the actual noise distribution beats a clean-text prompt. My document intelligence work at Data Insight was all this case.

**Cost at scale.** When the monthly volume is tens of millions of pages, a fine-tuned 8B model on dedicated hardware costs a fraction of frontier inference. The training cost is paid once.

**Residency.** When weights must run inside a client's VPC with no external calls, you are hosting a model. If you are hosting, tune it.

## The hybrid we usually end up with

For the loan documents, my recommendation is the hybrid we have landed on for two other clients. Prompt a frontier model for the bulk of fields. Fine-tune a small model for the two or three fields it loses on, and run it as a specialist tool the main extractor calls. Route by field, not by document.

The fine-tune pipeline on Vertex AI looks roughly like this:

```python
from google.cloud import aiplatform

job = aiplatform.CustomTrainingJob(
    display_name="loan-covenant-qlora",
    container_uri="us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.2-3:latest",
    script_path="train_qlora.py",
)
job.run(
    args=[
        "--base", "meta-llama/Meta-Llama-3-8B-Instruct",
        "--train", "gs://client-bucket/covenants/train.jsonl",
        "--eval", "gs://client-bucket/covenants/eval.jsonl",
        "--lora-r", "16", "--lora-alpha", "32", "--epochs", "3",
    ],
    machine_type="a2-highgpu-1g",
    accelerator_type="NVIDIA_TESLA_A100",
    accelerator_count=1,
)
```

The trained adapter is registered, evaluated against the same held-out set as the prompt, and served behind the same tool interface. The orchestrator does not know which fields are fine-tuned. It calls the extractor. The extractor routes.

## Building the eval set is the real work

Whichever way the decision goes, the labeled held-out set is the asset that survives. It outlasts the model, the prompt and the adapter.

Our rule is that the client's own analysts label it, not us. We know the schema. They know what a covenant clause looks like when a loan officer wrote it in a hurry in 2014. Two analysts label independently. Disagreements go to a third. For the loan documents, the initial disagreement rate between the two analysts was around one field in eight. That number is itself useful. It is the ceiling on what any model can achieve on that field, because the ground truth is not settled.

We also stratify. Two hundred documents chosen at random from a corpus that is ninety percent one document type will barely test the other ten percent. We sample by type, by year and by originating branch so the rare cases are present. The rare cases are usually where the fine-tune argument gets made, so they need to be in the set for the argument to be tested.

And we keep the set frozen. Once it is labeled, nobody touches it until the next scheduled refresh. The temptation to fix a label when the model gets it "right" and the label is "wrong" is strong. We log those as disputes and resolve them at the refresh, not in the middle of a comparison.

## The honest answer to the client

Start with prompting. Run the eval. Expect the frontier model to win most fields and lose a few. Fine-tune only for the fields it loses, and only if those fields matter to the business. Revisit in six months, because the table above changes every quarter.

Two years ago I fine-tuned first because it was the only way to get the accuracy. Now I prompt first because it is the fastest way to find out where fine-tuning is still needed.

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


---
title: "Year end: what the eval numbers said about 2025"
description: "A quiet week, so I pulled every eval run my team logged this year and read the trends. Groundedness, tool choice, cost per task, and three surprises."
pubDatetime: 2025-12-24T15:00:00Z
kind: article
theme: evals
tags: ["evals", "agents", "gcp"]
sources: []
---

## Table of contents

## A quiet week and a full table

Nothing came out this week. The labs are off. Half my team is off. I had a day with no client calls, so I did the thing I keep saying I will do. I exported every eval run we logged since June into one BigQuery table and read it.

That is about 1,900 runs across seven agent systems. Each run has a date, an agent, a prompt version, a model, a judge score per rubric line, a retrieval score where retrieval applies, and a cost. We have been writing these rows for six months. We have never looked at them all at once.

This is what the table said. Some of it I expected. Three things I did not.

## Groundedness went up, then plateaued

Our judge scores groundedness from 0 to 1. A 1 means every factual claim in the answer traces to a retrieved passage or a tool result. Below 0.85 fails the CI gate.

In June the median groundedness across our retrieval agents was 0.79. We were failing our own gate more than half the time and releasing anyway because there was no gate yet. By August it was 0.88. By October it was 0.91. Then it stopped moving.

The gains came from three changes. Parent-child chunking in July. Cross-encoder reranking in August. A rewrite of the citation instruction in September that told the model to abstain when it could not cite. After September, nothing we did moved the number more than a point in either direction.

The plateau is not the model. We tested the same eval set against three Gemini variants and the spread was under two points. The plateau is the data. The last nine percent of failures are questions where the client's own documents disagree with each other, or where the answer is not in the corpus at all. No retrieval change fixes a corpus that contradicts itself. We now surface those cases to the client as a data quality report instead of trying to prompt around them.

## Tool choice is where agents actually fail

I expected hallucination to be our biggest failure class. It is not. Our judge also scores tool choice. Did the agent call the right tool, with the right arguments, at the right time. Wrong tool choice accounted for 41 percent of failed runs this year. Hallucinated content accounted for 18 percent.

The pattern inside that 41 percent is consistent. The agent calls a tool that could plausibly answer the question but is not the one that holds the answer. A finance agent asks the general search tool about a metric that lives in a specific BigQuery view. A marketing agent asks the persona tool about a campaign budget.

We cut that number by half between September and December. Not with better prompts. With better tool descriptions and fewer tools. Two agents went from eleven tools to six. The judge score on tool choice rose for both. Every tool you add is a chance to pick the wrong one.


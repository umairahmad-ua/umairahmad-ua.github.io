---
title: "Year end: what the eval numbers said about 2025"
description: "A quiet week, so I pulled every eval run my team logged this year and read the trends. Groundedness, tool choice, cost per task, and three surprises."
pubDatetime: 2025-12-24T15:00:00Z
kind: article
tags: ["evals", "agents", "gcp"]
sources: []
diagram:
  caption: "Six months of eval runs read from one BigQuery table, the four findings, and the changes they drove for 2026."
  nodes:
    - { id: "runs", label: "1,900 eval runs since June", col: 0, kind: "source" }
    - { id: "judges", label: "Two judges per sample", col: 0, kind: "model" }
    - { id: "table", label: "One BigQuery table", col: 1, kind: "store" }
    - { id: "ground", label: "Groundedness plateau 0.91", col: 2, kind: "output" }
    - { id: "toolfail", label: "Tool choice 41 pct of fails", col: 2, kind: "output" }
    - { id: "cost", label: "Cost p50, p95 and max", col: 2, kind: "output" }
    - { id: "disagree", label: "Judge disagreement signal", col: 2, kind: "output" }
    - { id: "review", label: "Monday review", col: 3, kind: "human" }
    - { id: "traces", label: "Production traces", col: 3, kind: "source" }
    - { id: "changes", label: "2026 changes, retire cases", col: 4, kind: "output" }
  edges:
    - ["runs", "table"]
    - ["judges", "table", "score per rubric line"]
    - ["table", "ground"]
    - ["table", "toolfail"]
    - ["table", "cost"]
    - ["table", "disagree"]
    - ["ground", "review", "data, not the model"]
    - ["toolfail", "review", "fewer tools"]
    - ["cost", "review", "budget cap"]
    - ["disagree", "review", "predicts complaints"]
    - ["review", "changes"]
    - ["traces", "changes", "new eval cases"]
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

## Cost per task fell, then rose, then fell

This is the trend I find most useful. In June a completed task on Scout cost roughly three times what it costs today. Model price cuts explain some of that. Routing explains more. We moved the research and drafting steps to Flash in August and kept the expensive model for the final synthesis and the judge.

Then cost went up in October. Not because of the model. Because we added a verification step that reruns the retrieval when the judge flags low groundedness. That step is worth it. It also doubled the token spend on the hardest fifteen percent of tasks. We had not noticed because we were watching averages. The median was fine. The p95 had doubled.

We now track cost at p50, p95 and max per agent per week. The max is the one that gets discussed in the Monday review. One runaway loop in November cost more than a week of normal traffic before a budget cap killed it. That cap is now on every agent.

## The three surprises

First. Judge disagreement is a better signal than judge score. We run two judges on a sample and log where they disagree. Those disagreements predicted the client complaints we later received better than any single low score did. When two judges cannot agree whether an answer is grounded, a human usually cannot either. We now route disagreements to a human reviewer by default.

Second. Prompt changes are riskier than model changes. We swapped models under running agents four times this year. Eval movement each time was small and mostly positive. Prompt changes moved scores more, in both directions, and three of our five worst regressions this year were prompt edits that looked harmless in review. The eval gate caught all three. Code review caught none.

Third. Most of our eval cases were written in June and July. They describe the problems we had then. When I checked which cases still fail sometimes, most were written after September. The June cases pass at 99 percent. They are not testing anything anymore. Half of them should be retired and replaced with cases drawn from real failures in the traces.

## What the table could not tell me

Some questions the export could not answer, and I want to be honest about those too.

It could not tell me whether a passing score meant a happy user. We log judge scores. We log human overrides where a human queue exists. We do not log whether the client's analyst found the answer useful ten minutes later. Two of our agents have no human queue at all, so for those the judge is the only opinion in the table. I do not fully trust an eval that has never been checked against a person.

It could not tell me about the questions users stopped asking. If an agent gives a poor answer to a type of question, people learn not to ask it. The eval set does not shrink. The traffic does. I found one client where questions about a whole product line disappeared from the logs in October. Nobody reported a problem. They routed around it.

And it could not separate model behavior from data behavior for the retrieval agents. When groundedness dips, was it the model, the reranker or a bad document that entered the corpus that week. We now snapshot the corpus hash on every run, but we only started that in November. Six months of runs have no way to tell.

## What I am changing for 2026

Retire eval cases that have passed for ninety days and replace them from production traces. Track p95 cost per task as a gate, not just a dashboard. Cap tools per agent at eight unless someone argues for more in writing. Keep two judges on every sample and treat disagreement as a failure.

None of this is new thinking. All of it was sitting in a table we already had. The numbers were there since June. Reading them took an afternoon nobody had until the labs went quiet.

I will do this again in June. The next surprise is probably already in the table.

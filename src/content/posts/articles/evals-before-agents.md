---
title: "Evals before agents: the LLM-as-judge harness I run in CI"
description: "How my team gates every prompt and tool change behind scenario cases, a rubric-driven judge, retrieval metrics and a human review of disagreements."
pubDatetime: 2025-11-23T15:00:00Z
kind: article
tags: ["evals", "agents", "gcp"]
sources:
  - title: "Introducing Claude Sonnet 4.5"
    url: "https://www.anthropic.com/news/claude-sonnet-4-5"
    date: 2025-09-29
  - title: "Gemini 3 collection"
    url: "https://blog.google/products-and-platforms/products/gemini/gemini-3-collection/"
    date: 2025-11-18
diagram:
  caption: "Each PR runs the agent on frozen scenario cases, a different model judges the transcript, and CI blocks the merge below threshold."
  nodes:
    - { id: "pr", label: "Prompt or tool change PR", col: 0, kind: "source" }
    - { id: "cases", label: "Scenario cases, fixtures", col: 1, kind: "store" }
    - { id: "rubric", label: "Prose rubric", col: 1, kind: "store" }
    - { id: "agent", label: "Agent under test", col: 2, kind: "agent" }
    - { id: "judge", label: "Judge (different model)", col: 3, kind: "model" }
    - { id: "retrieval", label: "Retrieval metrics (RAGAS)", col: 3, kind: "tool" }
    - { id: "threshold", label: "Threshold check in CI", col: 4, kind: "tool" }
    - { id: "human", label: "Weekly human sample", col: 4, kind: "human" }
    - { id: "merge", label: "Merge or fail with table", col: 5, kind: "output" }
  edges:
    - ["pr", "agent"]
    - ["cases", "agent", "frozen fixture"]
    - ["rubric", "judge"]
    - ["agent", "judge", "transcript + tools"]
    - ["agent", "retrieval", "retrieved chunks"]
    - ["judge", "threshold", "score per dimension"]
    - ["retrieval", "threshold", "precision, recall"]
    - ["threshold", "merge"]
    - ["judge", "human", "20 runs a week"]
    - ["human", "rubric", "rewrite on disagree"]
---

An engineer on my team opened a pull request last week that changed one sentence in the campaign author prompt. The diff was eleven words. CI ran for six minutes and failed. Groundedness on the refusal cases had dropped from 0.96 to 0.81. The new sentence made the agent more eager to help, and eager agents cite things that are not there.

Eleven words. Nobody would have caught it in review. The harness caught it in six minutes.

This post is about that harness. It is not clever. It is the least clever thing we run, and it is the reason I sleep.

## Table of contents

## The rule

No prompt, tool description, tool schema, model swap or retrieval config change reaches production without passing the eval suite for every agent it touches. That is the whole rule. It is enforced in CI, not in code review, because code review does not run the agent.

I brought this habit from Developers Inc. The medical claims system there had an active learning loop: flagged claims went to reviewers, corrections came back as training data, and the model retrained weekly. We never let a retrained model out without scoring it on a held-out set first. The agent harness is the same idea with a different scorer.

## What a case looks like

Each agent has a directory of cases. A case is a scenario, an expected behavior, and a rubric weight. Here is one for the analysis pair, trimmed.

```yaml
id: analysis-042
agent: data_analysis_agent
scenario:
  session_state:
    brand_context: "Mid-price skincare, US and UK, launch in March"
  user: "Is the glass skin trend still growing or has it peaked?"
  datastore_fixture: fixtures/trends-2025-q3.jsonl
expect:
  must_call_tool: query_dashboard
  must_cite: true
  must_not_claim: ["competitor", "sales figure"]
  tone: "direct, no hedging beyond what the data supports"
rubric:
  groundedness: 0.4
  task_completion: 0.3
  tool_choice: 0.2
  tone: 0.1
```

The fixture is the important part. Every case runs against a frozen snapshot of retrieval data. If the live index changes, the eval does not move. If the eval moves, a prompt or a model moved it.

We have between forty and ninety cases per agent. The refusal cases outnumber the success cases for every agent that can cite data. That ratio was a deliberate choice after the first month, when the agents were confidently helpful about things the data did not say.

## The judge

A second model scores each run against the rubric. It sees the scenario, the agent's full transcript including tool calls, the retrieved chunks, and the rubric. It returns a score per dimension and one sentence of reasoning per dimension.

The rubric is prose, not a formula. This is the groundedness section as the judge sees it.

```text
Groundedness (0 to 1)
1.0  Every factual claim about trends or numbers points to a retrieved
     chunk that supports it. Refuses when no chunk supports the claim.
0.7  Claims are supported but one citation is loose or the number is
     rounded differently from the source.
0.4  At least one claim has no supporting chunk.
0.0  The response asserts a trend or figure the fixture does not contain,
     or fabricates a citation.
```

Two things I learned about judges.

The judge must not be the model under test. When the judge and the agent share a model, they share blind spots. The judge agrees with the agent's reasoning because it would have reasoned the same way. We run the judge on a different model family from the agent, and we rotate which one.

The judge needs the tool calls, not just the final answer. Half of the failures we care about are an agent answering correctly for the wrong reason. It skipped the tool and guessed from context. The final answer looks fine. The trace shows it never looked.

## Retrieval gets its own metrics

The judge scores what the agent said. It does not score what the retriever returned. Those are different failures with different owners.

For every case that hits the data store, we compute context precision and context recall against a labeled set of relevant chunks, and a faithfulness score for the final answer against the retrieved context. This is the RAGAS family of metrics. We compute them ourselves because the labeled set is small enough to hold in a spreadsheet.

The split matters in practice. When groundedness drops and context recall is flat, someone changed a prompt. When both drop, someone changed chunking or the index. The dashboard tells you which room to walk into.

## Thresholds and what happens when they fail

Each agent has a threshold per rubric dimension and a floor on the retrieval metrics. A pull request fails if any dimension for any touched agent falls below threshold, or if the mean drops more than two points from the main branch.

The failing run posts a table to the PR. Each row is a case, the old score, the new score, and the judge's one-sentence reason. The engineer reads the reasons before reading the numbers. The numbers say something moved. The reasons say what.

We do not allow overriding a failed threshold with a comment. You either fix the change, or you open a separate PR that changes the threshold and explains why. That second PR gets reviewed by someone who did not write the first one.

## Where humans still sit

The judge is a model. It is wrong sometimes. We catch that two ways.

Every week, someone on the team samples twenty judged runs and scores them by hand without seeing the judge's score. When human and judge disagree by more than 0.3 on a dimension, the case goes into a disagreement file. When the same kind of disagreement shows up three times, we rewrite that part of the rubric.

And every new case gets a human-written expected behavior before the judge ever sees it. The judge scores against that expectation. It does not decide what good looks like. People decide that. The judge just applies it 400 times faster than we could.

## Models we now evaluate against

Part of the harness's job is telling us when to switch models. Anthropic released Claude Sonnet 4.5 on September 29. Google released Gemini 3 Pro on November 18. Both went straight into the harness as candidate models for agents where quality matters more than cost.

The result is a table, not a verdict. A model can win on groundedness and lose on tool choice. It can win on both and cost three times more per case. The harness gives me the table. The decision is still mine, per agent, and it is usually different for the router than for the author.

## What it costs

The full suite for Scout is roughly 600 cases across nine agents. It runs in about six minutes on CI and costs a few dollars in model calls per run. We run it on every PR. I have never once thought it was too expensive.

I have thought the opposite. The first month, before the harness existed, we found problems in production that a case would have caught in a minute. Every one of those became a case. The suite is a list of ways we were wrong, kept so we do not repeat them.

## If you are starting

Write the refusal cases first. Freeze your retrieval fixture. Judge with a different model than you test. Put the tool calls in front of the judge. Set a threshold and refuse to override it in a comment.

None of that requires a framework. It requires deciding that an agent is software, and software gets tested before it reaches someone else's users. The eleven-word diff would have gone out. It did not. That is the harness doing the only thing I ask of it.

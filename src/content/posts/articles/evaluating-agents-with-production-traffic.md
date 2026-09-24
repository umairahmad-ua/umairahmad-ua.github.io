---
title: "Evaluating agents with production traffic: shadow runs and replays"
description: "Curated eval sets stop finding bugs after a few months. Replaying real sessions against a candidate agent finds them again. Here is how we do it without spending a fortune."
pubDatetime: 2026-07-22T15:00:00Z
kind: article
tags: ["evals", "agents", "gcp"]
sources:
  - title: "Google Gemini 3.6 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-07-21
diagram:
  caption: "Redacted production sessions are replayed against a candidate agent, judged pairwise, and disagreements go to a human."
  nodes:
    - { id: "prod", label: "Production sessions", col: 0, kind: "source" }
    - { id: "dlp", label: "Cloud DLP redaction", col: 1, kind: "tool" }
    - { id: "shadow", label: "Shadow deployment", col: 1, kind: "agent" }
    - { id: "corpus", label: "Replay corpus", col: 2, kind: "store" }
    - { id: "router", label: "Replay tool router", col: 2, kind: "tool" }
    - { id: "candidate", label: "Candidate agent", col: 3, kind: "agent" }
    - { id: "judge", label: "Pairwise judge (Claude)", col: 4, kind: "model" }
    - { id: "human", label: "Human reads disagreements", col: 5, kind: "human" }
  edges:
    - ["prod", "dlp", "sampled traces"]
    - ["prod", "shadow", "copy of live traffic"]
    - ["dlp", "corpus"]
    - ["corpus", "router", "recorded results"]
    - ["corpus", "candidate", "same inputs"]
    - ["router", "candidate", "tool results"]
    - ["candidate", "judge", "candidate output"]
    - ["corpus", "judge", "production output"]
    - ["shadow", "judge", "shadow output"]
    - ["judge", "human", "worse or disagree"]
---

## Table of contents

## When the eval set stopped finding things

Our eval suite for Scout has run in CI since late 2025. Every prompt and tool change gets scored against a fixed set of scenario cases. It caught a lot in the first six months.

By spring it was catching less. Not because the agent was perfect. Because the eval set was a snapshot of what we thought users would do in November, and users had moved on. The marketing teams using Scout were asking longer questions, chaining requests across sessions, and pasting in data formats we had never seen.

The curated set had become a regression test. A useful one. But a regression test only tells you that you have not broken what you already knew about.

## Replays

The fix was to evaluate against what users actually did. We already trace every production session. Each trace has the user input, the tool calls, the tool results and the final output. A replay takes a stored session and runs the candidate agent against the same inputs.

The hard part is the tool results. If the candidate makes the same tool call the production agent made, we return the recorded result. If it makes a different call, we have to decide. For read-only tools against stable data we let it call the real tool. For anything else we return a typed "not available in replay" and score the candidate on how it handles that.

```python
class ReplayToolRouter:
    def __init__(self, recorded: dict[str, ToolResult], live: ToolRegistry):
        self.recorded = recorded
        self.live = live

    async def call(self, name: str, args: dict) -> ToolResult:
        key = canonical_key(name, args)
        if key in self.recorded:
            return self.recorded[key]
        if self.live.is_read_only(name) and self.live.is_stable(name):
            return await self.live.call(name, args)
        return ToolResult.unavailable(
            reason="divergent call in replay", tool=name
        )
```

Canonical keys matter. Two calls with the same arguments in a different order are the same call. Two calls that differ only in a timestamp argument are usually the same call. We spent a week on the canonicalizer and it was worth it.

## Scoring a replay

We have the production output and the candidate output for the same input. The judge model sees both, plus the rubric, and answers one question. Is the candidate at least as good on each rubric dimension.

Pairwise scoring is more reliable than absolute scoring for this. Judges are inconsistent about what a seven out of ten means. They are more consistent about which of two answers is better grounded.

We use a different model family for the judge than for the agent under test. When the agent runs on Gemini, the judge is Claude, and the reverse. Yesterday Google released Gemini 3.6 Flash, and the first thing we did was run it as a judge against our existing judge on a sample. Agreement was high. Cost was lower. We will move some judge volume to it after a longer comparison.

## Disagreement is the signal

The judge does not get the last word. When the judge says the candidate is worse, a human looks. When the judge says the candidate is better on a dimension where the production output had a human complaint, a human looks. When two judges disagree, a human looks.

That last case has been the richest. Judge disagreement clusters. Most disagreements in one week in June were about a single tool whose output format had changed. Neither judge was wrong. The rubric had not been updated for the new format. We would not have found that from a curated set.

## Shadow runs

Replays test against the past. Shadow runs test against the present. A shadow deployment gets a copy of live traffic, runs the candidate, and stores the output without showing it to anyone. Same scoring, but on requests that are minutes old.

We shadow for one week before any change to Scout's orchestrator. Sub-agent changes get a replay and a shorter shadow. The week of shadow costs roughly the same as a week of production, so we do not do it for every change. We do it for the ones where a replay cannot reproduce the conditions, mostly changes to how the orchestrator routes.

## Privacy

Replays and shadows use real user data. Two rules.

First, the replay corpus is sampled and redacted before it is stored. PII detection runs on inputs and tool results with Cloud DLP, and the redacted version is what gets replayed. Redaction changes the input slightly, so a small share of replays fail for reasons unrelated to the candidate. We tag those and exclude them.

Second, shadow outputs are stored in the same project and retention window as production outputs, and are deleted on the same schedule. A shadow is production data. It does not get a looser policy because nobody saw it.

## The budget

Here is what this costs for Scout, as a share of the production agent's monthly spend.

- Nightly replay of a sampled set of sessions: about a tenth.
- Judge calls for the replay: about a twentieth, less once Flash-class judges take over.
- A shadow week before an orchestrator change: about a quarter, a few times a year.

The curated eval set still runs on every commit and costs almost nothing. The replay set runs nightly. The shadow runs happen when they are needed. Three layers, each catching a different class of problem.

## What changed in how we work

Replays turned evaluation from a thing we wrote into a thing we sample. The engineers I lead and mentor spend less time inventing test cases and more time reading disagreements. The rubric changes more often now because production keeps showing us where it is wrong.

The curated set is still there. It is smaller than it was. Most of what it used to cover, the replay corpus covers better, because the replay corpus is made of things that actually happened.

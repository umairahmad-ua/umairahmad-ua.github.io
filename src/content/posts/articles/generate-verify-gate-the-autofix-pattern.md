---
title: "Generate, verify, gate: the Autofix pattern for any agent that touches code"
description: "The three-stage loop I learned building vulnerability repair at Qwiet AI is the same loop every coding agent in 2026 needs."
pubDatetime: 2026-05-24T15:00:00Z
kind: article
tags: ["agents", "security", "claude"]
sources:
  - title: "Anthropic: Claude Code Security research preview"
    url: "https://www.anthropic.com/news/claude-code-security"
    date: 2026-02-20
  - title: "Claude Code: what's new, week 13 2026 (auto mode research preview)"
    url: "https://code.claude.com/docs/en/whats-new/2026-w13"
    date: 2026-03-23
  - title: "Cursor 3"
    url: "https://cursor.com/blog/cursor-3"
    date: 2026-04-02
---

## Table of contents

## A patch nobody asked to see

In 2024 I watched a generated patch land in a review queue at a security company. The scanner had found a SQL injection path. The model had rewritten the query to use parameters. The diff looked right. It also broke a downstream report because it changed the column order in the result set.

Nobody caught it in review. The regression suite caught it two hours later.

That afternoon is why I do not trust any agent that touches code without three separate stages between the model and the human. Generate. Verify. Gate. I learned the pattern at Qwiet AI, and I have not found a coding agent since that made it unnecessary.

## Where the pattern came from

From 2023 to 2025 I was Lead ML Engineer at Developers Incorporation. One of our client engagements was with Qwiet AI, the company formerly known as ShiftLeft. They sell static analysis to enterprises. Two of their systems shaped how I think about agents.

The first was Ocular. It represents a codebase as a code property graph, then finds paths from a source (user input, a network read) to a sink (a database call, a shell exec). We trained graph neural networks over those paths to score which ones were real vulnerabilities and which were noise. My part was the feature pipelines and the training loop, then squeezing inference down so it could run inside a customer's CI.

The second was Autofix. Once Ocular flags a path, Autofix proposes a repair. This is where the agent work lived, and where the pattern came from.

Autofix was never one model call. It was three agents with hard boundaries between them:

1. A generator that reads the vulnerable path, the surrounding code and the fix history, then proposes a patch.
2. An evaluator that checks whether the patch is semantically correct. Does the source-to-sink path still exist? Did the patch change behavior outside the flagged region?
3. A tester that runs the existing regression suite against the patched code and reports failures.

Only after all three agreed did a human see the diff. The human saw the patch, the evaluator's reasoning and the test results together. That ordering was the product.

## Why three stages and not one good prompt

The obvious objection in 2024 was that a strong enough model would get it right the first time. The objection is stronger in 2026. Models are much better at code now. I still do not accept it.

The generator and the evaluator have different jobs, and the jobs conflict. A generator is rewarded for producing a plausible patch. An evaluator is rewarded for finding what is wrong with it. When you ask one model call to do both, it grades its own homework. I have never seen that work reliably, on any model tier, including the ones released this spring.

The tester is different again. It does not reason. It runs code. That is the point. A regression suite is the one part of the loop that cannot be talked into agreeing.

Split the roles and the failure modes become visible. A bad patch that passes the evaluator but fails tests tells you the evaluator is weak. A patch that fails the evaluator but would have passed tests tells you the evaluator is too strict. You can tune each stage because each stage produces its own signal.

## The gate is a policy, not a vibe

The word "gate" gets used loosely. Here is what I mean by it. A gate is a written condition that must be true before the next stage runs, and it is enforced in code, not in a prompt.

At Autofix the gates were roughly these:

```text
loop autofix(finding):
  patch = generator(finding, context)

  # Gate 1: the patch must be a valid, minimal diff
  if not parses(patch) or touched_files(patch) > 3:
      return escalate("patch too broad", patch)

  verdict = evaluator(finding, patch)

  # Gate 2: the flagged path must be gone and nothing else may change
  if verdict.path_still_reachable or verdict.behavior_changed_outside_region:
      if attempts < 2:
          attempts += 1
          context += verdict.reasoning
          goto loop
      return escalate("evaluator rejected", patch, verdict)

  results = tester(patch)

  # Gate 3: no new test failures, and the suite actually ran
  if results.new_failures > 0 or results.tests_run == 0:
      return escalate("regression", patch, results)

  return human_review(patch, verdict, results)
```

Three things to notice. The retry budget is small and explicit. A generator that needs five attempts is telling you the finding is out of its depth. The evaluator's reasoning feeds the next attempt, so the loop learns within a task. And the last line is not "merge." It is "human review." The agent never merged. It prepared a case.

`tests_run == 0` is there because of a real incident. A misconfigured runner reported zero failures because it ran zero tests. Green is not the same as tested.

## What the 2026 coding agents changed, and what they did not

The tooling moved a long way this spring. In February, Anthropic put Claude Code Security into a limited research preview, a scanner that finds vulnerabilities and proposes fixes inside Claude Code. In late March, Claude Code released an auto mode research preview, where the agent runs without approving every tool call. In early April, Cursor 3 arrived with an Agents Window built around running several coding agents at once.

These are real changes. The generator stage is now commodity. Anyone can get a plausible patch for a flagged finding in seconds.

What did not change is the other two stages. None of these products remove the need for an independent evaluator or for tests that actually run. Auto mode makes the question sharper, not softer. When the agent is no longer asking permission per step, the gates are the only thing standing between a wrong patch and your main branch.

I run Claude Code in auto mode for my own work every day. I do it with a pre-commit hook that runs the suite, a review step that a second model performs against the diff, and a rule that nothing merges without a human reading the evaluator output. That is Autofix, rebuilt with 2026 tools.

## How I apply this at Zazmic today

At Zazmic I lead and mentor the ML engineering team building agents on Google Cloud. Most of what we build is not security tooling. The pattern still shows up in every agent that writes something executable.

Our migration agents translate legacy SQL to BigQuery. The generator translates. A separate validation agent reconciles row counts and aggregates against the source system. A human signs off per cutover batch. Same three stages.

Our cloud operations agent reads alerts and proposes remediations. The generator proposes. A policy check confirms the action is inside a pre-approved playbook. A human confirms anything destructive. Same three stages, with the "tester" replaced by a policy engine because you cannot run a regression suite against production infrastructure.

The stages change shape by domain. The order does not.

## What I would tell someone starting now

Do not start with the generator. Start with the gates. Write down, in plain language, what must be true before a human sees the output. Then write the evaluator that checks those conditions. Then wire in whatever runs code for real. Only then plug in the model that proposes changes.

If you start with the generator you will spend two months tuning prompts and then discover you have no way to know whether the output is right. I did that once. Ocular and Autofix taught me not to do it again.

The models will keep getting better. The evaluator will keep being a separate job. Plan for both.

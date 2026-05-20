---
title: "Generate, verify, gate: the Autofix pattern for any agent that touches code"
description: "The three-stage loop I learned building vulnerability repair at Qwiet AI is the same loop every coding agent in 2026 needs."
pubDatetime: 2026-05-24T15:00:00Z
kind: article
theme: tools
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


---
title: "Code review changed when everyone got Claude Code"
description: "Every engineer on my team now writes code with an agent. Review had to change. Here are the norms we landed on and the parts I still read line by line."
pubDatetime: 2026-04-15T15:00:00Z
kind: article
theme: leadership
tags: ["claude", "agents", "infra"]
sources:
  - title: "Cursor 3"
    url: "https://cursor.com/blog/cursor-3"
    date: 2026-04-02
  - title: "The next evolution of the Agents SDK"
    url: "https://openai.com/index/the-next-evolution-of-the-agents-sdk/"
    date: 2026-04-15
---

## Table of contents

## The pull request that was too good

In January one of my engineers opened a pull request that added retry logic to our migration validation agent. Four hundred lines. Tests included. Docstrings on everything. Consistent style. I approved it in ten minutes.

Two weeks later it retried a reconciliation query into a BigQuery quota error, because the retry policy did not distinguish between a transient failure and a query that was simply wrong. The engineer had described what they wanted to Claude Code, accepted the result, run the tests and opened the PR. The code was clean. The intent was incomplete. And I had reviewed the code, not the intent.

That was the moment I accepted that review had to change.

## What changed about the code

Every engineer I lead and mentor now writes with an agent. Claude Code for most, Gemini tooling for some, [Cursor](https://cursor.com/blog/cursor-3) for two who prefer it. The code they produce has changed in three ways.

There is more of it. A task that used to be an eighty-line diff is now two hundred lines with tests, types and error handling. The extra lines are usually correct and usually not what I need to look at.

It is more uniform. Agent-written code looks alike. That is good for reading and bad for spotting the one place where a human made a decision.

It is complete in ways the author did not choose. The retry logic had exponential backoff and jitter because the agent added them. The author had not thought about backoff at all. That is where the bug lived.


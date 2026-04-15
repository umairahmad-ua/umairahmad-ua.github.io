---
title: "Code review changed when everyone got Claude Code"
description: "Every engineer on my team now writes code with an agent. Review had to change. Here are the norms we landed on and the parts I still read line by line."
pubDatetime: 2026-04-15T15:00:00Z
kind: article
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

## Norm one: the intent comment

Every PR now opens with a short section the author writes by hand. Not the agent. What was the problem, what did you decide, what did you not do. Three to six sentences.

For the retry PR, that section would have said "retry on network and 5xx errors, up to three times." I would have asked "and on quota errors?" and we would have found it before merge.

The intent comment is the highest-value thirty seconds in our process. It forces the author to know what they asked for. It gives me the thing to review against. When the intent comment and the code disagree, that is the bug.

## Norm two: label what the agent wrote

We tag PRs with the share of agent-authored code, in rough bands. Mostly human, mixed, mostly agent. The label is not a judgment. It tells me where to spend attention.

Mostly-agent PRs get a different review. I read the intent comment, the tests and the diff of any file that touches money, permissions, external calls or data deletion. I skim the rest. Mostly-human PRs get the old line-by-line review, because a human wrote every line for a reason and I want to see the reasons.

## Norm three: the eval diff is part of the PR

For anything that touches an agent, a prompt, a tool contract or a retrieval setting, the PR must include the eval run before and after. Same case set, same judge, scores side by side.

This existed before Claude Code. It became non-negotiable after, because agents change prompts fluently and the prose reads fine either way. The eval numbers are the only thing that tells me whether the change helped.

## What I still read line by line

Four things, no matter who or what wrote them.

**Anything that writes.** Database writes, file writes, API calls that change state. Agents are good at reads. Writes are where a plausible-looking line deletes the wrong rows.

**Permission and scope code.** The ops agent's playbook checks, the review queue's approval logic, IAM bindings in Terraform. A mistake here does not show up in tests. It shows up in an incident.

**Error handling around external calls.** The retry PR. Agents write generic handlers. Our systems need specific ones.

**Anything the intent comment did not mention.** If the code does a thing the author did not describe, the author may not know it does that thing. I ask.

## A review that caught the right thing

Last month an engineer on my team opened a PR that added retry logic to a tool wrapper. The intent comment said the tool sometimes timed out and the fix was to retry three times with backoff. The diff was clean. The tests were green. The agent-written label was on it.

I read the intent comment and then the eval diff. The eval diff showed cost per task on that agent up by about a fifth, with success rate unchanged.

That combination is the tell. A change that makes the agent no better and one fifth more expensive is not a fix. It is a symptom moved somewhere else. I asked one question in the review. Why does the tool time out.

The answer took a day to find. The tool was being called with a query that returned far more rows than it needed, and the timeout was the backend giving up on the size. The retry did not help. It just paid for the oversized query three times before failing anyway.

The real fix was a tighter query and a page size limit. Cost per task went down, not up. Success rate went up a little because the tool now returned in time. The retry logic stayed, at one retry instead of three, for real transient failures.

I would not have found that reading the diff line by line. The code was correct. What was wrong was the framing in the intent comment, and the eval diff exposed it. That is the shape of most useful reviews now. The numbers ask the question. The reviewer just has to notice them.

## What review is for now

Before, review caught bugs and taught style. Agents write fewer surface bugs and style is uniform. So review is now mostly about two things. Does the author understand what they merged. Does the change do what the system needs and nothing else.

That is closer to design review than code review. It takes me less time per line and more time per PR. I read fewer lines and ask more questions. The questions are the review.

## Elsewhere

OpenAI published [the next evolution of the Agents SDK](https://openai.com/index/the-next-evolution-of-the-agents-sdk/) today, with a native sandbox for agent-run code. The sandbox question is one my team will hit as our agents start writing and running code in client environments. Where the code runs matters as much as who reviews it. I will read the details this week.

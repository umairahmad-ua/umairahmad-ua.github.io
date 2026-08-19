---
title: "Cost per task: the number that decides if an agent survives"
description: "Success rate without cost is a vanity metric. How my team traces the cost of every completed agent task and lets that number shape the architecture."
pubDatetime: 2026-08-23T15:00:00Z
kind: article
theme: evals
featured: true
tags: ["agents", "evals", "infra"]
sources:
  - title: "Anthropic: introducing Claude Sonnet 5"
    url: "https://www.anthropic.com/news/claude-sonnet-5"
    date: 2026-06-30
  - title: "Claude Code: what's new, week 30 2026 (Claude Opus 5)"
    url: "https://code.claude.com/docs/en/whats-new/2026-w30"
    date: 2026-07-24
  - title: "New AI model releases and news, August 2026 (GPT-5.6 Luna price cut)"
    url: "https://blog.mean.ceo/new-ai-model-releases-news-august-2026/"
    date: 2026-07-30
  - title: "Anthropic: auto mode is now the default in Claude Code"
    url: "https://claude.com/blog/auto-mode-default-in-claude-code"
    date: 2026-08-14
---

## Table of contents

## The agent that worked and got switched off

Early this year a client of ours ran a document agent for about six weeks and then turned it off. It did the job. It extracted what they asked for, with an accuracy the reviewers were happy with. It was turned off because the finance team looked at the invoice and compared it to the cost of the two people who used to do the work.

The agent lost. Not on quality. On cost per completed task.

I have told that story to every engineer on my team since. Success rate is what you demo. Cost per task is what you survive on.


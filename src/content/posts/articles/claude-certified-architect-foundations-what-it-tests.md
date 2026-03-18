---
title: "Claude Certified Architect Foundations: what the exam actually tests"
description: "I sat the new Anthropic architect certification the week after it launched. Here is what it covers, what surprised me, and where it stops short of production."
pubDatetime: 2026-03-22T15:00:00Z
kind: article
theme: platform
tags: ["claude", "agents", "mcp"]
sources:
  - title: "Channel Dive: Anthropic launches Claude channel partner program"
    url: "https://www.channeldive.com/news/anthropic-launches-claude-channel-partner-program/814569/"
    date: 2026-03-12
  - title: "The Next Web: Anthropic commits $100M to Claude Partner Network"
    url: "https://thenextweb.com/news/anthropic-commits-100m-to-claude-partner-network"
    date: 2026-03-12
  - title: "A2A Protocol v1.0"
    url: "https://a2a-protocol.org/latest/blog/2026/03/12/a2a-protocol-ships-v10-production-ready-standard-for-agent-to-agent-communication/"
    date: 2026-03-12
---

Anthropic held its first Partner Summit in Carlsbad on March 12 and 13. It launched the Claude Partner Network with a $100 million commitment, and with it the first Claude certifications. The architect track opens with Claude Certified Architect – Foundations. Pearson VUE lists it as CCAR-F. I booked a slot for the following week and sat it on a Thursday morning from my desk.

I passed. This post is about what the exam is, not about how I did. I will not repeat questions. I will tell you what it measures and what it does not.

## Table of contents

## The format

Sixty scenario questions. One hundred and twenty minutes. A scaled score with a pass mark of 720 out of 1000. The credential is valid for twelve months. You take it online with a proctor or at a test center.

The stated scope is the Claude API, the Claude Agent SDK, Claude Code, MCP, agent architecture, evaluation and safety controls. That matches what I saw. There is very little trivia. Almost every question describes a situation and asks what you would do.

Two hours for sixty scenarios is not generous. Several questions run to a full screen of context. I finished with eleven minutes left and I read fast.

## What surprised me

The exam cares more about failure than about capability. I expected questions about which model to pick or how to structure a prompt. There were some. Most of the weight sat on what happens when things go wrong. A tool returns malformed output. A context window fills up mid-task. A user asks the agent to do something outside its authorization. A downstream system is slow and the agent has a budget.

That is the right emphasis. It is also the part of agent engineering that most tutorials skip.

The second surprise was how much MCP mattered. I went in thinking MCP would be one section among six. It was closer to a thread through the whole exam. Server design, tool contracts, what belongs in a tool description versus a system prompt, how to handle authentication across servers. If you have only consumed MCP servers and never written one, you will feel it.

The third surprise was the evaluation content. The exam treats evals as an architecture concern, not a research afterthought. Questions asked where in a pipeline you would measure, what you would measure, and how you would gate a release on the result. I have been arguing for this in client work for two years. It was strange and pleasant to see it on a test.


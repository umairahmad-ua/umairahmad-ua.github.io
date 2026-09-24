---
title: "Claude Certified Architect Foundations: what the exam actually tests"
description: "I sat the new Anthropic architect certification the week after it launched. Here is what it covers, what surprised me, and where it stops short of production."
pubDatetime: 2026-03-22T15:00:00Z
kind: article
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
diagram:
  caption: "What the architect exam tests, failure paths, MCP, evals and safety, and what only production teaches after it."
  nodes:
    - { id: "study", label: "Agent SDK docs, small agent", col: 0, kind: "source" }
    - { id: "mcp", label: "Write an MCP server", col: 1, kind: "tool" }
    - { id: "ctx", label: "Context compaction", col: 1, kind: "tool" }
    - { id: "safety", label: "Hooks and permissions", col: 1, kind: "tool" }
    - { id: "evals", label: "Eval design, LLM judge", col: 1, kind: "tool" }
    - { id: "exam", label: "CCAR-F, 60 scenarios", col: 2, kind: "tool" }
    - { id: "pass", label: "Credential, 12 months", col: 3, kind: "output" }
    - { id: "gaps", label: "Not tested: cost, tracing", col: 3, kind: "output" }
    - { id: "prod", label: "Run it in production", col: 4, kind: "human" }
  edges:
    - ["study", "mcp"]
    - ["study", "ctx"]
    - ["study", "safety"]
    - ["study", "evals"]
    - ["mcp", "exam"]
    - ["ctx", "exam"]
    - ["safety", "exam"]
    - ["evals", "exam", "gate a release"]
    - ["exam", "pass", "720 of 1000"]
    - ["exam", "gaps"]
    - ["pass", "prod"]
    - ["gaps", "prod", "learn after"]
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

## How it compares to Google Cloud certifications

I hold Google's developer credentials and I work at a Google Cloud Premier Partner, so this comparison is the one people ask me for.

Google's professional exams test breadth across a platform. They want you to know which service does what and how services connect. You can pass them with excellent product knowledge and modest engineering judgment.

CCAR-F is narrower and deeper. It tests judgment on one family of tools. Product knowledge alone would not get you to 720. You need to have thought about agent design as a systems problem. That makes it a better signal for the specific job of building agents on Claude. It also makes it a worse signal for general cloud competence, which is fine. It is not trying to be that.

The two are complementary. The Google credential tells a client I can run their platform. The Anthropic credential tells them I can design the agent on it.

## What to study

Read the Agent SDK documentation end to end and then build one small agent with it. Not a chatbot. Something with three tools, a budget and a failure path. You will learn more from the failure path than from anything else.

Write an MCP server. Even a trivial one that exposes two tools over a local database. Pay attention to how you write the tool descriptions. The exam cares about this, and so does every model you will ever put in front of that server.

Understand context management. Compaction, what gets summarized, what gets dropped, and how to keep an agent honest about what it no longer remembers. This came up more than I expected.

Know the safety controls as an engineer, not as a policy reader. Where do permissions live. What can a hook intercept. How do you stop an agent from taking an irreversible action without a human.

Finally, read about evaluation design. Not a specific framework. The concepts. Reference-based versus reference-free grading, LLM-as-judge and its failure modes, and how to build an eval set that survives a prompt change.

I studied for about a week alongside work. If you have built agents on the Claude platform for a few months, a week is enough. If you have not, the exam will tell you.

## What the exam does not cover

Cost. Not one scenario I saw asked about the price of a design. In client work the budget per task decides more architecture than any other constraint. An exam that wants to certify architects should ask what a design costs to run at ten thousand requests a day.

Observability was also light. A question or two touched tracing. None asked how you would find out which of five agents in a chain produced a bad answer three days after the fact. That is most of my debugging life.

Neither gap makes the exam bad. Both tell you where to keep learning after you pass.

## The caution

A certification proves you can reason about the right answer under exam conditions. It does not prove you have watched an agent fail in production at two in the morning and fixed it.

I have run multi-agent systems for real clients on Vertex AI Agent Engine since last summer. The things that hurt were never the things an exam asks. A tool that started returning a slightly different JSON shape after a vendor update. A session store that grew until latency doubled. A user who found a phrasing that routed to the wrong specialist agent every time. You learn those by running the system, not by studying for a test.

So hold the credential lightly. It is a good filter for hiring managers who need one. It is a reasonable way to force yourself to read the documentation properly. It is not a substitute for a production incident.

## Why I bothered

Two reasons. My team works on both Google and Anthropic tooling and the certification gave me a structured way to close gaps in the Anthropic half. And the Partner Network is going to matter to consultancies. Having certified architects on staff will be table stakes for partner tiers within a year. I would rather be early.

The same week the exam launched, A2A 1.0 reached its first stable release. The tooling is moving quickly. A twelve-month validity period on this certification is not a marketing choice. It is an honest estimate of how long the material will stay current.

If you are building on Claude and you have a spare week, take it. Then go run something in production and find out what the exam could not teach you.

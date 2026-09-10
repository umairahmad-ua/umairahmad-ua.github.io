---
title: "One year of weekly notes: what I learned writing in public"
description: "Fifty two Sunday notes, every claim sourced, no week skipped. What the discipline did to my thinking, what readers actually asked, and what changes next."
pubDatetime: 2026-09-09T15:00:00Z
kind: article
featured: true
tags: ["agents", "evals", "claude", "openai"]
sources:
  - title: "Anthropic releases Claude Fable 5.1 and Claude Mythos 5.1"
    url: "https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads"
    date: 2026-09-01
  - title: "OpenAI GPT-6 Astra"
    url: "https://www.cnbc.com/2026/09/03/open-ai-astra-gpt-6-cyber.html"
    date: 2026-09-03
---

## Table of contents

## The first Sunday

The first note went up on September 21, 2025. It was about GPT-5-Codex and a rule I had just given my team about replaying agent sessions before anything reached a client. It was 280 words. I wrote it in forty minutes and almost did not publish it.

Fifty two Sundays later, this is the retrospective. Not on AI. On the practice of writing about it every week, in public, with sources.

## The rule that shaped everything

I gave myself one rule at the start. Every external event I mention gets a source with a date, listed at the bottom of the note. If I cannot find a primary source, I do not mention the event.

This sounded like a citation habit. It turned out to be a thinking habit. About once a month I sat down to write about something I was sure had happened, went looking for the source and found that it had not happened the way I remembered. A release date was a week off. A feature was in preview, not GA. A number came from a blog post, not the company.

Each of those corrections was small. Together they changed how I talk in client meetings. I say "I think" more and "it is" less, unless I have the source in front of me. For someone who runs presales calls, that is a real change in how I sound.

## What the discipline cost

About three hours a week. Two on Sunday to write, one across the week to read and save links. I skipped no weeks. Two holiday weeks at the end of December had nothing to report, so I wrote about the year instead.

The cost that surprised me was attention. Once you commit to a weekly note, you read the week differently. Every announcement becomes a candidate. I had to learn to let most of them go. The note is 300 words. It has room for two or three things. Choosing them is the work.

## What readers asked

The site has a small readership. Most of it came from LinkedIn and from clients I sent links to. Here is what they asked, roughly in order of frequency.

**"How do you evaluate agents?"** By far the most common question, and the reason the evals article from November is still the most read piece. People are building agents. Very few of them have a way to know if the agent got better or worse after a change. I now open most client engagements with the eval harness, before any agent code.

**"Which framework should I use?"** I stopped answering this directly around February. The honest answer is that the framework matters less than the tool layer and the eval set, and that answer disappoints people. The article on ADK versus chains is the long version.

**"Is the certification worth it?"** After the Claude Certified Architect piece in March, this came up a lot. My answer has not changed. It is worth it if you are already running agents in production and want a shared vocabulary with a partner ecosystem. It is not a substitute for running one.

**"What does your team actually do all day?"** This one I liked. The answer is in the one-year retrospective from June. Less model work than people expect. More tool contracts, evals and cost tracing.

## What changed in my thinking

Reading the notes in order, I can see four shifts.

In the autumn of 2025 I wrote about models. Which one was better, which one to use. By spring I was writing about platforms and protocols. MCP, A2A, the Agent Platform rename. By summer I was writing about cost and permission models. The models had become interchangeable enough that they stopped being the interesting part.

I also got quieter. Early notes have opinions about the industry. Later notes have opinions about my own systems. I think that is the sourcing rule at work. It is easy to have a view about a company. It is harder to have a sourced view about your own eval scores, and more useful.

## The week that made the point

This week is a good example of why the notes exist. Anthropic released [Fable 5.1](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) last Tuesday with a large cut to cache read prices. On Thursday OpenAI released [GPT-6 Astra](https://www.cnbc.com/2026/09/03/open-ai-astra-gpt-6-cyber.html) with computer use and a cyber capability threshold that made the news.

A year ago I would have written about which model is ahead. This week I wrote about how a pricing change moved cost per task on two production agents and did not move it on two others. That is a smaller story. It is also the one my clients can act on.

## What changes next year

Three things.

The weekly note stays. The format works and I do not want to break the streak.

The articles get more specific. The most useful pieces this year were the ones about one system and one problem. The migration agents, the permission model, the campaign guardrails. Fewer surveys. More runbooks.

And I will publish more of the eval sets. Not the client data. The structure. Case definitions, rubrics, judge prompts. People keep asking how to evaluate agents, and the honest answer is that it is unglamorous work that is easier to copy than to explain.

## Thank you

To the people who read these, corrected my dates, and sent me the questions above. The notes are better because someone was checking. That is the whole point of writing them in public.

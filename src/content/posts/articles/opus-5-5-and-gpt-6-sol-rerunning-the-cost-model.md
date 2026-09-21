---
title: "Opus 5.5 and GPT-6 Sol: re-running the cost model"
description: "Two price cuts landed on the same Tuesday. I re-ran cost per task across four production agents the next morning. Which steps moved, which stayed on Flash, and what the routing table looks like now."
pubDatetime: 2026-09-23T15:00:00Z
kind: article
theme: evals
tags: ["agents", "infra", "claude"]
sources:
  - title: "xAI Grok 4.7"
    url: "https://x.ai/news/grok-4-7"
    date: 2026-09-21
  - title: "AWS open-sources the Strands harness"
    url: "https://strandsagents.com/blog/introducing-strands-harness/"
    date: 2026-09-21
  - title: "Anthropic: Claude Opus 5.5"
    url: "https://www.anthropic.com/claude-opus-5-5"
    date: 2026-09-22
  - title: "OpenAI: introducing GPT-6 Sol and Luna"
    url: "https://openai.com/index/introducing-gpt-6-sol-and-luna/"
    date: 2026-09-22
---

## Table of contents

## Tuesday, twice

Anthropic released [Claude Opus 5.5](https://www.anthropic.com/claude-opus-5-5) on Tuesday morning at four dollars per million input tokens and twenty out, 40 percent below Opus 5. By the afternoon OpenAI had [GPT-6 Sol and Luna](https://openai.com/index/introducing-gpt-6-sol-and-luna/) out at half the GPT-5.6 price, two and ten for Sol, ten cents and fifty for Luna. Monday had already brought [Grok 4.7](https://x.ai/news/grok-4-7) at two and six.

I have written before that cost per completed task is the number that decides whether an agent survives. A price cut of this size is the kind of event that model was built for. So on Wednesday morning I re-ran it across the four agents my team runs in production, and this is what moved.


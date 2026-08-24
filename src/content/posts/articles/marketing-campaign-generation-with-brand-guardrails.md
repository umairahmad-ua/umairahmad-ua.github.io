---
title: "Marketing campaign generation with brand guardrails"
description: "How Scout's campaign author agent turns brand voice rules into policies, checks every claim against product data, and hands drafts to legal before they reach an ad account."
pubDatetime: 2026-08-26T15:00:00Z
kind: article
theme: industry
tags: ["agents", "adk", "gcp", "evals"]
sources:
  - title: "Claude Academy launches; computer use, browser-use tool, Skills API, Files API GA"
    url: "https://github.com/jqueryscript/anthropic-claude-timeline"
    date: 2026-08-20
  - title: "Google ADK TypeScript 2.0 GA"
    url: "https://adk.dev/2.0/"
    date: 2026-08-21
  - title: "Claude memory unified across chat and Cowork"
    url: "https://claude.com/blog/claudes-memory-works-everywhere-and-you-decide-whats-in-it"
    date: 2026-08-25
---

## Table of contents

## The draft that used the wrong word

A brand manager at one of Let's Forage's clients sent us a screenshot in March. The campaign author agent had written a headline that called their product "the best" in its category. The copy was fine. The word was not. Their legal team does not allow superlatives without a cited study, and there was no study.

Nothing in the system was broken. The model did what marketers do. It wrote persuasive copy. The problem was that the brand's rules lived in a PDF nobody had turned into anything an agent could check.

That screenshot is why the campaign author now has a guardrail layer. This article is about how it works.

## What the campaign author does

Scout is the multi-agent system behind the Let's Forage platform. The campaign author is one of its nine agents. It takes a brief from the strategy agent, cultural signals from the research agents and a persona from the persona agent, and it produces campaign copy. Headlines, body text, hooks for short video, variants per channel.

The output feeds two places. A human reviewer in the platform, and, for approved campaigns, the client's ad accounts through the Meta ads integration. The second path is why the guardrails matter. Copy that reaches an ad account reaches customers.


---
title: "Marketing campaign generation with brand guardrails"
description: "How Scout's campaign author agent turns brand voice rules into policies, checks every claim against product data, and hands drafts to legal before they reach an ad account."
pubDatetime: 2026-08-26T15:00:00Z
kind: article
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
diagram:
  caption: "Every campaign draft passes brand policies and claim checks before legal approves it for Meta ads."
  nodes:
    - { id: "brief", label: "Brief, signals, persona", col: 0, kind: "source" }
    - { id: "author", label: "Campaign author agent", col: 1, kind: "agent" }
    - { id: "policy", label: "Brand voice policy checks", col: 2, kind: "tool" }
    - { id: "claims", label: "Gemini Flash claim extract", col: 2, kind: "model" }
    - { id: "vais", label: "Vertex AI Search catalog", col: 3, kind: "tool" }
    - { id: "queue", label: "Legal review queue", col: 4, kind: "human" }
    - { id: "meta", label: "Meta ads accounts", col: 5, kind: "output" }
  edges:
    - ["brief", "author"]
    - ["author", "policy", "every draft"]
    - ["author", "claims", "factual sentences"]
    - ["claims", "vais", "each claim"]
    - ["policy", "queue", "block rewrites, warn"]
    - ["vais", "queue", "source, status table"]
    - ["queue", "meta", "approval record id"]
---

## Table of contents

## The draft that used the wrong word

A brand manager at one of Let's Forage's clients sent us a screenshot in March. The campaign author agent had written a headline that called their product "the best" in its category. The copy was fine. The word was not. Their legal team does not allow superlatives without a cited study, and there was no study.

Nothing in the system was broken. The model did what marketers do. It wrote persuasive copy. The problem was that the brand's rules lived in a PDF nobody had turned into anything an agent could check.

That screenshot is why the campaign author now has a guardrail layer. This article is about how it works.

## What the campaign author does

Scout is the multi-agent system behind the Let's Forage platform. The campaign author is one of its nine agents. It takes a brief from the strategy agent, cultural signals from the research agents and a persona from the persona agent, and it produces campaign copy. Headlines, body text, hooks for short video, variants per channel.

The output feeds two places. A human reviewer in the platform, and, for approved campaigns, the client's ad accounts through the Meta ads integration. The second path is why the guardrails matter. Copy that reaches an ad account reaches customers.

## Brand voice as policy, not prompt

The first version put the brand voice in the system prompt. "Write in a warm, direct tone. Avoid jargon." It worked about as well as you would expect. The model followed it most of the time and drifted under pressure from the brief.

The current version treats brand rules as policies with three parts: a rule, a check and a severity.

```yaml
# brands/acme/voice.yaml
rules:
  - id: no-superlatives
    text: "Do not use superlatives (best, fastest, #1) without a cited source."
    check: regex_or_judge
    pattern: "\\b(best|fastest|number one|#1|greatest)\\b"
    severity: block
  - id: no-competitor-names
    text: "Never name a competitor."
    check: entity_list
    entities: ["brands/acme/competitors.txt"]
    severity: block
  - id: warm-direct
    text: "Warm and direct. Second person. No corporate hedging."
    check: judge
    rubric: "brands/acme/tone-rubric.md"
    severity: warn
  - id: accessibility
    text: "Reading level at or below grade 8."
    check: readability
    max_grade: 8
    severity: warn
```

The rules still go into the prompt, so the model tries to follow them. But every draft also runs through the checks. A block severity means the draft never reaches a human. It goes back to the agent with the failed rule attached, and the agent rewrites. A warn severity means the draft reaches the reviewer with the warning shown.

The distinction between prompt and policy is the whole idea. The prompt shapes what the model produces. The policy decides what leaves the system.

## Claims get checked against product data

Superlatives are the easy case. The harder one is factual claims. "Lasts 48 hours." "Made with 90 percent recycled materials." "Available in 12 colors." The model produces these confidently, and they are sometimes wrong, because the brief was vague or the product changed.

Every draft goes through a claim extraction step. A small Gemini Flash call pulls out sentences that assert a fact about the product. Each claim is checked against the client's product data through Vertex AI Search over their catalog and spec sheets. The result is one of three states.

- **Supported.** A source document backs the claim. The source is attached to the draft.
- **Unsupported.** No source found. The claim is flagged and the reviewer sees it in red.
- **Contradicted.** A source says something different. The draft is blocked and the agent rewrites with the correct value.

We measured this on a month of drafts for one apparel client. About one claim in fifteen was unsupported or contradicted before the check. Most were small. A color count off by one, a material percentage rounded up. Small is exactly what a regulator or a competitor notices.

## The legal review queue

Approved drafts do not go to the ad account. They go to a queue. The client's legal or brand team sees each campaign with the policy results, the claim sources and the persona it targets. They approve, edit or reject.

The queue is where I learned the most about what humans need from an agent. They do not want the reasoning. They want the evidence. The first version of the queue showed the agent's chain of thought. Reviewers ignored it. The current version shows a table. Claim, source, status. Rule, result. That is what they read.

Approval takes a few minutes per campaign now. Before the guardrail layer it took longer, because reviewers had to find the problems themselves.

## The Meta integration

Once legal approves, the campaign author formats variants for each placement and pushes them through the Meta ads integration. The push is idempotent. Every variant carries the campaign id, the draft version and the approval record id. If something goes wrong downstream, we can trace an ad back to the exact draft and the person who approved it.

I mention this because it is the last guardrail. An agent that can write to an ad account is an agent that can spend money. The approval record is the thing that makes the write legitimate.

## What changed this week

Three releases this week touched this work.

Google made [ADK TypeScript 2.0](https://adk.dev/2.0/) generally available on Thursday. Scout is Python, but the Let's Forage frontend team writes TypeScript, and they have wanted to build small agents inside the platform. Same framework on both sides is a real simplification.

Anthropic made the [Skills API generally available](https://github.com/jqueryscript/anthropic-claude-timeline) on the Claude Platform, alongside computer use and the browser tool. Skills are a natural fit for brand policies. A brand's voice rules, packaged once, loaded by any agent that writes for that brand. We do this today with YAML files and our own loader. A standard way to do it is welcome.

And yesterday Anthropic [unified memory](https://claude.com/blog/claudes-memory-works-everywhere-and-you-decide-whats-in-it) across Claude chat and Cowork. The part I noticed was "you decide what is in it." For a brand agent, memory of past campaigns is useful and memory of a rejected claim is dangerous. The control matters more than the feature.

## The lesson

Marketing copy is where models are most fluent and least trustworthy. The fluency is why clients want the agent. The guardrail layer is why they keep it.

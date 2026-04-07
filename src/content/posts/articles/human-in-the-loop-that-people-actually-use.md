---
title: "Human-in-the-loop that people actually use: designing the review queue"
description: "Every agent we run has a human gate. Most review queues fail because nobody designed the queue. Here is what my team learned across four client systems."
pubDatetime: 2026-04-08T15:00:00Z
kind: article
theme: structure
tags: ["agents", "evals", "healthcare"]
sources:
  - title: "Anthropic announces Claude Mythos Preview and Project Glasswing"
    url: "https://www.anthropic.com/glasswing"
    date: 2026-04-07
  - title: "Claude Managed Agents public beta"
    url: "https://claude.com/blog/claude-managed-agents"
    date: 2026-04-08
---

## Table of contents

## The queue nobody opened

At Developers Inc we built a medical claims system that processes more than fifty thousand claims a day. Claims the model was unsure about went to a review queue. In the first month, the queue grew to nine thousand items. Reviewers opened it, saw nine thousand items and closed it. The queue was technically a human gate. In practice it was a hole the claims fell into.

We fixed it, and rejections eventually fell 35 percent. But the lesson stuck. A human-in-the-loop step is not a checkbox in an architecture diagram. It is a product. If nobody designs it, nobody uses it.

Every agent my team runs today has a human gate. Migration cutovers, supply chain recommendations, ops remediations, marketing drafts. Here is what we do differently now.

## Rule one: the queue is sized for the humans, not the model

The model can flag anything. The humans have a fixed number of hours. If the agent sends two hundred items a day to a team that can review forty, the queue is dead by Wednesday.

So we start from the reviewers. How many people, how many minutes per item, how many hours a day. That gives a daily budget. The agent's escalation threshold is tuned to hit the budget, not to hit a confidence number that sounds good.

For the medical claims system, that meant raising the threshold until the queue was about three hundred a day, which the reviewers could clear. Claims below the threshold were auto-submitted with monitoring. Some of those were wrong. Fewer of them were wrong than when the queue was ignored entirely, because now every flagged item actually got a human.


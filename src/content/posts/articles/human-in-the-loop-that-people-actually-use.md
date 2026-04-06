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


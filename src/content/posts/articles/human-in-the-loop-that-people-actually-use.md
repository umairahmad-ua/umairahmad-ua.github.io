---
title: "Human-in-the-loop that people actually use: designing the review queue"
description: "Every agent we run has a human gate. Most review queues fail because nobody designed the queue. Here is what my team learned across four client systems."
pubDatetime: 2026-04-08T15:00:00Z
kind: article
tags: ["agents", "evals", "healthcare"]
sources:
  - title: "Anthropic announces Claude Mythos Preview and Project Glasswing"
    url: "https://www.anthropic.com/glasswing"
    date: 2026-04-07
  - title: "Claude Managed Agents public beta"
    url: "https://claude.com/blog/claude-managed-agents"
    date: 2026-04-08
diagram:
  caption: "Agent recommendations pass a budget-sized threshold into a grouped review queue, and every decision feeds override metrics."
  nodes:
    - { id: "agents", label: "Agent recommendation", col: 0, kind: "agent" }
    - { id: "threshold", label: "Threshold sized to budget", col: 1, kind: "tool" }
    - { id: "explain", label: "One-line explanation", col: 1, kind: "model" }
    - { id: "auto", label: "Auto-approve, monitored", col: 2, kind: "output" }
    - { id: "queue", label: "Firestore queue, grouped", col: 2, kind: "store" }
    - { id: "notify", label: "Pub/Sub to Slack, email", col: 3, kind: "tool" }
    - { id: "reviewers", label: "Reviewers in web app", col: 3, kind: "human" }
    - { id: "decisions", label: "Session store + BigQuery", col: 4, kind: "store" }
    - { id: "expire", label: "Max age: page or expire", col: 4, kind: "output" }
    - { id: "looker", label: "Looker: override, age", col: 5, kind: "output" }
  edges:
    - ["agents", "threshold", "confidence"]
    - ["agents", "explain"]
    - ["threshold", "auto", "below threshold"]
    - ["threshold", "queue", "flagged"]
    - ["explain", "queue", "line + evidence"]
    - ["queue", "notify"]
    - ["notify", "reviewers"]
    - ["queue", "reviewers", "one decision, N items"]
    - ["queue", "expire", "SLA reached"]
    - ["reviewers", "decisions", "approve or override"]
    - ["decisions", "looker", "override rate"]
    - ["decisions", "agents", "labeled examples"]
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

## Rule two: every item explains itself in one line

A reviewer should know why an item is in front of them before they open it.

Bad: "Low confidence."

Good: "Procedure code 27447 with diagnosis M17.11. Payer X rejected this pair 40 percent of the time last quarter."

The second one tells the reviewer what to look at. It also tells them when the agent is wrong, because they can see its reasoning and disagree with it.

For the migration agents, the one line is "Row count matches. Sum of `amount` differs by 0.3 percent. Likely rounding in the legacy `ROUND()` call." For the ops agent it is "Memory pressure on pod X. Playbook 12 says restart. Last restart was 40 minutes ago, which is below the two-hour cooldown."

Writing that line is a model task. Deciding what goes in it is a design task. We spend more time on the second.

## Rule three: batch approvals for the boring cases

Most items in a good queue are the same kind of item. Twenty stored procedures that all translated cleanly except for a date format. Fifteen supply chain alerts on the same delayed vessel.

A reviewer who has to click approve fifteen times will start clicking without reading. So the queue groups. "Fifteen orders affected by vessel delay at Chittagong. Recommended action for all: notify buyers, no date change." One review, one decision, fifteen items cleared.

Grouping is where the agent adds real value to the review process. It notices that fifteen items share a cause. A human scrolling a list would not.

## Rule four: measure override rate, and act on it

Override rate is the fraction of agent recommendations that the human changes. It is the single most useful number in an agent system.

If it is near zero, either the agent is very good or the humans have stopped reading. You find out which by sampling. We pull twenty approved items a week and have a second person review them cold.

If it is high, the agent is wrong a lot, and every override is a labeled example. For the claims system, overrides fed weekly retraining through active learning. For the marketing agents in Scout, overrides feed prompt changes and eval cases. An override is not a failure. It is the cheapest training signal you will ever get.

The number we watch most is the trend. Override rate should fall over the first months and then flatten. If it falls to zero fast, we get suspicious.

## Rule five: the SLA belongs to the queue

An item that sits in the queue for a week is not being reviewed. It is being ignored with extra steps.

Each queue has a maximum age. When an item reaches it, something happens. For the migration agents, it blocks the cutover batch and someone gets paged. For supply chain alerts, it escalates to the sourcing manager. For marketing drafts, it expires and the requester gets a note that says "not reviewed, resubmit if still needed."

The expire option sounds harsh. It is the one that keeps queues honest. If items expire and nobody complains, they did not need review.

## What we build it with

The queue is a Firestore collection and a small web app. Each item has the agent's recommendation, the one-line explanation, the evidence links, a group key and a deadline. Reviewers work in the app. Decisions write back to the agent's session store and to BigQuery for the override metrics. Notifications go through Pub/Sub to Slack or email depending on the client. Looker shows the queue age and override trend to the people who own the process.

None of that is clever. It is a product built for the people who use it, which is what the original claims queue was not.

## This week

Anthropic put [Claude Managed Agents](https://claude.com/blog/claude-managed-agents) into public beta today. From the announcement, the human approval step is a first-class part of the runtime. I want to see what the reviewer experience looks like before I judge it, because that is the part that fails in practice.

The [Mythos Preview and Project Glasswing](https://www.anthropic.com/glasswing) announcement on Tuesday is a different scale of human-in-the-loop. A frontier model finding vulnerabilities, with humans deciding what to disclose and when. Same principle. The gate is only as good as the process around it.

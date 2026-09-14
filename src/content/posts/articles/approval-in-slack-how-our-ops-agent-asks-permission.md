---
title: "Approval in Slack: how our ops agent asks permission"
description: "The cloud operations agent proposes an action in Slack with evidence, a human approves or rejects, and the agent executes only inside its playbook. How the approval loop is built."
pubDatetime: 2026-09-16T15:00:00Z
kind: article
theme: tools
tags: ["agents", "security", "claude"]
sources:
  - title: "Google Gemini 3.8 Live in the Gemini API"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
    date: 2026-09-15
  - title: "Cowork is now Claude"
    url: "https://claude.com/blog/cowork-is-now-claude"
    date: 2026-09-16
---

## Table of contents

## The message at 2:14 in the morning

At 2:14 on a Tuesday morning in August, a Slack channel for one of our clients received a message from a bot. It said that a Cloud Run service had been returning errors for six minutes, that the error rate was 31 percent, that the last deploy was fourteen hours earlier, and that the agent proposed rolling back to the previous revision. It attached the error log excerpt and the deploy diff. It asked for approval and said it would escalate to the on-call phone if nobody answered in ten minutes.

The on-call engineer tapped approve from bed. The rollback took forty seconds. The agent posted the new error rate three minutes later, which was zero, and closed the thread.

That message is the product. Everything else in the ops agent exists to make that message trustworthy. This piece is about how the approval loop works, because the loop is where most of the design went.

## Why approval and not autonomy

The agent could have rolled back on its own. The playbook said so, the confidence was high, and the action was reversible. We still asked.

The reason is not caution for its own sake. It is that the client's trust in the agent was built one approved message at a time. Every approval is a human looking at the evidence and agreeing. After three months of agreements, the client asked us to let the agent roll back on its own for that one playbook. We did. That is the right order. Autonomy granted after a record, not assumed before one.

The second reason is that the approval message is also the audit record. A human who approved can explain the decision later. An agent that acted alone leaves a log line that nobody remembers reading.


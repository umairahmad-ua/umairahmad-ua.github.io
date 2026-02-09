---
title: "Guardrails that fail closed: a policy layer for agents"
description: "Input and output policies, tool allowlists, and the decision that matters most: what the agent does when the policy service itself is down."
pubDatetime: 2026-02-11T15:00:00Z
kind: article
theme: tools
tags: ["security", "agents", "gcp"]
sources:
  - title: "Anthropic releases Claude Opus 4.6"
    url: "https://www.anthropic.com/news/claude-opus-4-6"
    date: 2026-02-05
  - title: "OpenAI Frontier enterprise agent platform"
    url: "https://openai.com/index/introducing-openai-frontier/"
    date: 2026-02-05
---

## Table of contents

## The outage that taught us the rule

In January a policy service my team runs went down for nine minutes. It sits between our agents and their tools. Every tool call passes through it and gets a yes or a no.

For those nine minutes, one agent kept working. It had been written to treat a timeout as a yes. The other agents stopped. They had been written to treat a timeout as a no.

Nothing bad happened. The agent that kept working was a read-only research agent. But the review afterwards was uncomfortable, because the difference between the two behaviors was one line of code and nobody had made the decision on purpose.

We now have a rule. Guardrails fail closed. If the policy layer cannot answer, the answer is no.


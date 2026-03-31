---
title: "When to use A2A: agents across company boundaries"
description: "A2A 1.0 arrived in March. Here is the one case where I think my team needs it, the cases where MCP is enough, and how signed Agent Cards change the trust question."
pubDatetime: 2026-04-01T15:00:00Z
kind: article
theme: tools
tags: ["agents", "mcp", "gcp"]
sources:
  - title: "A2A Protocol ships v1.0"
    url: "https://a2a-protocol.org/latest/blog/2026/03/12/a2a-protocol-ships-v10-production-ready-standard-for-agent-to-agent-communication/"
    date: 2026-03-12
  - title: "Amazon Bedrock AgentCore Evaluations GA"
    url: "https://aws.amazon.com/about-aws/whats-new/2026/03/agentcore-evaluations-generally-available"
    date: 2026-03-31
---

## Table of contents

## The question a client asked

Two weeks after [A2A 1.0 arrived](https://a2a-protocol.org/latest/blog/2026/03/12/a2a-protocol-ships-v10-production-ready-standard-for-agent-to-agent-communication/), a client asked me whether we should rebuild their agents on it. They had read that it was the standard for agents talking to agents. Their system has nine agents. Surely, they said, that is agents talking to agents.

It is not, and the distinction matters enough to write down.

## Two protocols, two different problems

MCP is how an agent talks to a tool. The tool is a database, an API, a file system, a search index. The tool has no goals. It does what it is asked and returns a result. The agent decides what to ask.

A2A is how an agent talks to another agent. The other agent has its own goals, its own tools, its own owner. You do not call it. You give it a task and it works on the task, possibly for a long time, possibly asking you questions, and it returns when it is done or stuck.

Inside one company, on one platform, under one team, the second thing is rarely what you need. Scout, the system we run for Let's Forage, has nine agents under one orchestrator. They share a session. They share tools. They are the same codebase deployed together. When the orchestrator hands work to the persona agent, that is a function call with a model in the middle. There is no trust boundary. There is no discovery problem. A2A would add ceremony and remove nothing.

MCP is enough when the things you connect are yours. I said that to the client and they were relieved.


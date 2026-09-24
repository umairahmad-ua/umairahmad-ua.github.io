---
title: "When to use A2A: agents across company boundaries"
description: "A2A 1.0 arrived in March. Here is the one case where I think my team needs it, the cases where MCP is enough, and how signed Agent Cards change the trust question."
pubDatetime: 2026-04-01T15:00:00Z
kind: article
tags: ["agents", "mcp", "gcp"]
sources:
  - title: "A2A Protocol ships v1.0"
    url: "https://a2a-protocol.org/latest/blog/2026/03/12/a2a-protocol-ships-v10-production-ready-standard-for-agent-to-agent-communication/"
    date: 2026-03-12
  - title: "Amazon Bedrock AgentCore Evaluations GA"
    url: "https://aws.amazon.com/about-aws/whats-new/2026/03/agentcore-evaluations-generally-available"
    date: 2026-03-31
diagram:
  caption: "The three question decision between MCP for tools you own and A2A for agents across a company boundary."
  nodes:
    - { id: "proposal", label: "Proposed agent connection", col: 0, kind: "source" }
    - { id: "q1", label: "Different owner?", col: 1, kind: "human" }
    - { id: "q2", label: "Would refuse an MCP server?", col: 2, kind: "human" }
    - { id: "q3", label: "Task with a lifecycle?", col: 3, kind: "human" }
    - { id: "mcp", label: "MCP server to the tool", col: 4, kind: "tool" }
    - { id: "a2a", label: "A2A with signed Agent Card", col: 4, kind: "agent" }
    - { id: "scout", label: "Scout, nine agents, one team", col: 5, kind: "output" }
    - { id: "supplier", label: "Buyer and supplier planners", col: 5, kind: "output" }
  edges:
    - ["proposal", "q1"]
    - ["q1", "mcp", "no"]
    - ["q1", "q2", "yes"]
    - ["q2", "mcp", "no"]
    - ["q2", "q3", "yes"]
    - ["q3", "mcp", "no, one call"]
    - ["q3", "a2a", "three yes answers"]
    - ["mcp", "scout"]
    - ["a2a", "supplier", "GAP and Levi's"]
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

## The case where I do want A2A

The apparel supplier we work with plans production for GAP and Levi's. The buyers send forecasts. The supplier plans capacity. Today that exchange is spreadsheets and portals and a weekly call.

Imagine both sides have planning agents. The buyer's agent knows demand and can answer "what happens to your forecast if we deliver a week late." The supplier's agent knows capacity and can answer "what happens to cost if you pull the date in." Neither company will let the other read its data directly. Neither will expose its planning tools as MCP servers to an outside party. But both would accept a well-defined task from the other side and return a well-defined answer.

That is agent to agent across a company boundary. Different owners, different data, different goals, one shared task. It is exactly what A2A is for.

We have not built it. The buyers would have to run an agent and the standard is a month old. But when I sketch it, A2A is the only protocol that fits, and 1.0 made it plausible for the first time.

## What signed Agent Cards change

The piece of 1.0 that matters most to me is the signed Agent Card.

An Agent Card is the document an agent publishes to say who it is, what it can do and how to reach it. Before 1.0 it was a JSON file you trusted because you fetched it over HTTPS from a domain you recognized. That is fine for a demo and not fine for a supplier committing production capacity based on a buyer's forecast.

With signatures, the supplier's agent can verify that the card came from the buyer's organization and has not changed since it was issued. The buyer can do the same in reverse. This does not solve trust. It moves trust to where it already lives, in the two companies' identity providers and their existing contracts. That is the right place for it.

Governance under the Linux Foundation is the other piece. When I tell a client to build on a protocol, I am asking them to bet years of work on it. A neutral home makes that bet easier to defend in a procurement review.

## The decision I use

When someone on my team proposes A2A, I ask three questions.

**Does the other agent have a different owner?** If it is our agent talking to our agent, no.

**Would the other side refuse to expose its tools directly?** If they would happily give us an MCP server, no. Use the MCP server.

**Is the exchange a task with a lifecycle, not a request with a response?** If it completes in one call, it is a tool. If it can take hours, ask clarifying questions and come back partial, it is an agent.

Three yes answers and A2A is the right shape. Anything less and we are adding a protocol to look modern.

## What I am watching

Amazon made [AgentCore Evaluations generally available](https://aws.amazon.com/about-aws/whats-new/2026/03/agentcore-evaluations-generally-available) on March 31. It is not an A2A story, but it is related. The moment agents cross company boundaries, each side needs to evaluate the other's output before trusting it. The supplier cannot take the buyer's forecast on faith any more than it did when the forecast came as a spreadsheet. Evaluation of another party's agent is going to be its own discipline. The vendors building eval products are getting ready for that world before most of their customers are.

For my team the plan is unchanged. MCP for tools, which is all of our current work. A2A for the one design that needs it, when a buyer is ready to run an agent on their side. I will write it up when that happens.

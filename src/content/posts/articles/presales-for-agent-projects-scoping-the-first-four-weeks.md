---
title: "Presales for agent projects: scoping the first four weeks"
description: "The discovery questions I ask, why every pilot starts with an eval set, how I price by task instead of by seat, and the promises I refuse to make."
pubDatetime: 2026-02-25T15:00:00Z
kind: article
tags: ["agents", "evals", "gcp"]
sources:
  - title: "Anthropic releases Claude Sonnet 4.6"
    url: "https://en.wikipedia.org/wiki/Claude_(language_model)"
    date: 2026-02-17
  - title: "Google Gemini 3.1 Pro"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-02-19
diagram:
  caption: "The four week presales flow from discovery questions through an eval set to a narrow pilot with agreed exit numbers."
  nodes:
    - { id: "q", label: "Six discovery questions", col: 0, kind: "source" }
    - { id: "data", label: "Data access check", col: 1, kind: "tool" }
    - { id: "cases", label: "100 to 200 real cases", col: 1, kind: "source" }
    - { id: "rubric", label: "Client scoring rubric", col: 2, kind: "human" }
    - { id: "evals", label: "Eval set and judge", col: 2, kind: "store" }
    - { id: "stake", label: "Security, finance, staff", col: 3, kind: "human" }
    - { id: "pilot", label: "Narrow ADK pilot", col: 3, kind: "agent" }
    - { id: "review", label: "Human reads every reply", col: 4, kind: "human" }
    - { id: "exit", label: "Three exit numbers", col: 5, kind: "output" }
  edges:
    - ["q", "data"]
    - ["q", "cases"]
    - ["cases", "rubric", "in their words"]
    - ["rubric", "evals", "judge prompt"]
    - ["cases", "evals"]
    - ["evals", "pilot", "job description"]
    - ["data", "pilot", "typed tools"]
    - ["stake", "pilot", "met before pilot"]
    - ["pilot", "review"]
    - ["review", "exit", "override rate"]
    - ["pilot", "exit", "cost per task"]
---

## Table of contents

## The call I get every week

A director of operations has a deck from a vendor. The deck says an agent will handle forty percent of their support tickets. She wants to know if that is true and what it would cost to find out.

I run the presales call for most agent projects at Zazmic. I also run the delivery afterwards, so I have a strong incentive to scope honestly. Over-promise in February and I am the one in the room in June.

This is how I run the first four weeks.

## Week zero: the discovery questions

I ask the same six questions on every call. The answers tell me whether there is a project.

**Where does the work start and end today.** I want the actual trigger. An email arrives, a ticket is opened, a file lands in a folder. And the actual end. Someone clicks approve, a record changes, a customer gets a reply. If nobody can describe both ends, the agent has no boundary and the project has no scope.

**Who touches it in between, and what do they decide.** Every human step is either a decision or a copy. Copies are easy for an agent. Decisions are where the risk is. I count them.

**What does a wrong answer cost.** A wrong product recommendation costs a click. A wrong prior authorization costs a patient a week. The answer sets the review model. Low cost means the agent acts and a human samples. High cost means the agent proposes and a human approves every one.

**Where is the data, and who is allowed to see it.** This kills more projects than any model limitation. If the data is in a system with no API and permissions nobody can explain, that is the project, not the agent.

**How will you know it worked.** Not "it feels faster." A number, measured today, that the client already tracks. Handling time, rejection rate, time to first response.

**Who owns it after we leave.** An agent is software. It needs someone who will read the eval dashboard on a Monday. If there is no name, I say so.

## Weeks one and two: build the eval set before the agent

This is the part that surprises clients. We do not start by building the agent. We start by collecting one hundred to two hundred real cases with the answer a good human gave.

For the support director that meant pulling two hundred closed tickets, with the reply that was sent and a flag for whether the customer came back. For a claims client it meant two hundred claims with the adjudication outcome.

Two things happen in these two weeks. First, we learn what the work actually is. The deck said forty percent of tickets were simple. The cases said twenty-two percent were simple and another twenty needed one lookup a human could do in a minute. That is still a good project. It is a different project.

Second, we get the scoring rubric out of the client's head and into a file. When the client's own lead tells us what makes a reply good, in their words, we have the judge prompt for the eval harness. The agent, when it arrives, is measured against the client's standard from its first run.

## Weeks three and four: the narrow pilot

We build the smallest agent that handles the clearest slice. For support that was the twenty-two percent, with a human reading every reply before it sent. On Google Cloud that is usually one ADK agent on Agent Engine, a couple of typed tools into the client's systems, and Langfuse tracing from the first request.

The pilot has three exit numbers agreed in writing before it starts. Task success rate on the eval set. Human override rate in the pilot. Cost per completed task. If all three clear the agreed line, we expand. If not, we have spent four weeks and learned something true.

## The stakeholders who are not on the call

The director of operations is on the call. Three people who will decide whether the project survives are not. I ask to meet each of them before the pilot starts.

Security wants to know what the agent can reach and what it logs. I bring the tool allowlist and the trace schema, and I show them the redaction step that runs before anything is written. That meeting is thirty minutes if I bring the documents and three weeks if I do not.

Finance wants the cost model. Not the model price list. The cost per completed task, with the human review time included, next to the cost of the current process. If I cannot show that by week four, the project does not get a budget line.

The people doing the work today want to know if they are being replaced. I tell them the truth. The agent reads and drafts. They decide. Their overrides train it. In every project that has lasted, the people doing the work became the owners of the eval set. In the one that did not last, nobody had talked to them until launch day.

## Pricing by task, not by seat

Most vendor decks price by seat. I price the pilot as a fixed engagement and the production system by completed task, with a floor and a ceiling.

Per-task pricing keeps everyone honest. The client pays for work done. I get paid more when the agent handles more, which means I care about the success rate as much as they do. And it forces the cost-per-task tracing that I would want anyway, because I cannot invoice for what I did not measure.

Model prices move under this arrangement. Both [Claude Sonnet 4.6](https://en.wikipedia.org/wiki/Claude_(language_model)) and [Gemini 3.1 Pro](https://en.wikipedia.org/wiki/Gemini_(language_model)) arrived this month. Each one changes the margin on a task. The routing layer absorbs most of that. The contract has a clause for the rest.

## What I refuse to promise

**A percentage before the eval set exists.** Anyone who tells you forty percent on the first call is quoting a deck, not your data.

**Zero human review on high-cost decisions.** If a wrong answer costs a patient or a regulator, a human approves. I will make that human faster. I will not remove them.

**A fixed timeline before I have seen the data access.** The agent is three weeks. The API that does not exist is three months.

**A demo as evidence.** I will show one. I will also say, out loud, that the demo predicts nothing.

## Why this works

Clients sometimes push back on the four weeks. They want the agent in week one. I explain that the eval set is the agent's job description. Building the agent first means writing the job description after the hire.

The ones who stay through the four weeks are the ones still running the system a year later. That is the only sales metric I track.

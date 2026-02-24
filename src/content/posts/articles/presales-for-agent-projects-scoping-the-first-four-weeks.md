---
title: "Presales for agent projects: scoping the first four weeks"
description: "The discovery questions I ask, why every pilot starts with an eval set, how I price by task instead of by seat, and the promises I refuse to make."
pubDatetime: 2026-02-25T15:00:00Z
kind: article
theme: leadership
tags: ["agents", "evals", "gcp"]
sources:
  - title: "Anthropic releases Claude Sonnet 4.6"
    url: "https://en.wikipedia.org/wiki/Claude_(language_model)"
    date: 2026-02-17
  - title: "Google Gemini 3.1 Pro"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-02-19
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


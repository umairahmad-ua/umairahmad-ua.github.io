---
title: "Notes from Google Cloud Next 2026: Vertex AI becomes the Gemini Enterprise Agent Platform"
description: "What last week's Cloud Next announcements mean for a team running multi-agent systems on Vertex AI Agent Engine, and what to adopt now versus wait on."
pubDatetime: 2026-04-26T15:00:00Z
kind: article
tags: ["gcp", "agents", "adk"]
sources:
  - title: "Google Cloud Next 2026 wrap-up"
    url: "https://cloud.google.com/blog/topics/google-cloud-next/google-cloud-next-2026-wrap-up"
    date: 2026-04-24
  - title: "HPCwire: Google unveils Gemini Enterprise Agent Platform"
    url: "https://www.hpcwire.com/aiwire/2026/04/23/google-unveils-gemini-enterprise-agent-platform/"
    date: 2026-04-23
  - title: "Google Open Source: a year of A2A"
    url: "https://opensource.googleblog.com/2026/04/a-year-of-open-collaboration-celebrating-the-anniversary-of-a2a.html"
    date: 2026-04-09
  - title: "Google Developers: why we built ADK 2.0"
    url: "https://developers.googleblog.com/why-we-built-adk-20/"
    date: 2026-03-26
  - title: "Google Cloud: introducing Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
---

Cloud Next ran April 22 to 24 in Las Vegas. I did not go. I watched the keynotes from Houston with two of my engineers on a call and a shared document open. By Thursday evening the document had forty lines of "what does this mean for us". This post is the cleaned-up version.

For context, my team runs Scout, a multi-agent marketing intelligence system for Let's Forage, on Vertex AI Agent Engine. We built it on Google's Agent Development Kit last summer. Clients of that platform include teams at Apple and Meta. When Google renames the thing our production system sits on, I pay attention.

## Table of contents

## The headline: Vertex AI is now the Gemini Enterprise Agent Platform

Google announced the Gemini Enterprise Agent Platform as generally available and described it as the evolution of Vertex AI. That is the sentence everyone quoted. The practical reading is that the model training and serving parts of Vertex AI continue, and the agent building, running and governing parts get a new name and a more opinionated shape.

Alongside it came the Gemini Enterprise app for end users and a command-line tool for agents. The app is the successor path from the Gemini Enterprise launch in October, which itself replaced Agentspace. The CLI is new and I will come back to it.

I have mixed feelings about the naming. Vertex AI was a name my clients had learned. Gemini Enterprise Agent Platform is a name that tells them what it does. In two years the second will have been the right call. In the next six months I will be explaining to procurement teams that the invoice line item changed and the service did not.

## What changes for a running Agent Engine deployment

Nothing broke. Scout kept running through the announcement week. Our endpoints, sessions and memory stores are all still there under the old console paths.

What Google described is a migration path rather than a cutover. Existing Agent Engine deployments are represented in the new platform. New capabilities land in the new console first. I expect the old console to stay for a year and then quietly stop getting features.

My plan is to move Scout's development environment to the new platform in May and leave production where it is until we have run a full month there. Development first, production after evidence. Same rule as every other migration.

## ADK 2.0

Google announced ADK 2.0 as an alpha in late March. Cloud Next was the first time I heard the team talk through the reasoning at length. Two features matter to me.

Graph workflows make explicit what we were doing implicitly. Scout's data analysis agent is a sequential chain of a research agent and an author agent. In ADK 1.x we expressed that with a sequential agent wrapper. In 2.0 it becomes a declared graph with typed edges. That means we can draw it, validate it and diff it. I have wanted to diff agent topologies in code review for a year.

Agent teams are the other one. Named groups of agents with shared context and a coordinator. Scout's root orchestrator with its eight specialists is exactly this shape. We built it by hand. Having a first-class construct means less code to own, if the construct fits.

The if matters. Alpha software from a platform vendor tends to fit the vendor's demos. I will port one of Scout's smaller specialists to 2.0 in a branch and see how much of our hand-built coordination the new team construct actually replaces. If it is most of it, we move. If it is half, we wait for a beta.

## A2A 1.0 and what I actually use it for

The Agent2Agent protocol reached 1.0 on March 12, and Google celebrated the anniversary on April 9 with a summary of where it is used. Signed agent cards and Linux Foundation governance are the two changes that made it real for enterprise.

Here is my honest position. I do not have a cross-vendor agent-to-agent use case in production today. Scout's agents all live on one platform and talk through the framework. A2A solves a problem I will have, not one I have.

The one place I am experimenting is at the boundary between our agents and a client's existing systems. A client's internal support agent, built by a different team on different tooling, wants to hand a conversation to one of ours. A2A with signed cards is the right answer to "how do we trust that handoff". It is the first protocol I have seen that treats agent identity as a security concern from the start.

## The agents CLI

The new command-line tool is the announcement I am most immediately happy about. It deploys, lists and inspects agents from a terminal. Until now that was a mix of SDK calls and console clicks, and none of it sat well in a CI pipeline.

We will adopt this the week it is stable enough to script. Our deployment for Scout is currently a Python script that calls the SDK and a lot of environment variables. Replacing that with a CLI invocation in a Cloud Build step is a small change that removes a class of mistakes.

## Pricing and the conversation with clients

Google did not change the compute pricing model for agent runtimes at Next, as far as I could find in the wrap-up. What changed is packaging. Some governance and evaluation features that used to be separate line items are described as part of the platform now.

That is good news for my clients and a small headache for me. Good because the eval tooling I have been building by hand may have a managed equivalent. A headache because the cost model my proposals use will need to be redone once the pricing pages settle. I have told two clients to expect a revised estimate in June and not to act on the old one.

## What I am adopting now

The CLI, as soon as it scripts cleanly. The new console for development environments. Agent Engine memory bank features that were previewed and are now generally available, because Scout's session memory is a home-grown thing I would like to stop maintaining.

## What I am waiting on

ADK 2.0 for production until it leaves alpha and I have ported one real agent. The Gemini Enterprise app for our client's end users, because their users live in a custom frontend and moving them is a product decision, not a platform one. Any A2A rollout beyond experiments until a client brings me the cross-team handoff problem for real.

## The thing nobody said on stage

The pace of naming changes is a cost. Every rename is a week of updating diagrams, a round of client questions, and a small erosion of the confidence that made them choose the platform. Google is not alone in this. But a platform that wants to be the place enterprises run agents for a decade should think about how often it asks those enterprises to relearn the vocabulary.

I still think this is the right platform for the work we do. The agent runtime is solid. The model access is first class. The tooling is finally catching up to the runtime. Cloud Next made that clearer, not less clear. I just wish I could tell my clients the name would hold for two years.

## For my team

The shared document ended with three assignments. One engineer ports a Scout specialist to ADK 2.0 in a branch. One sets up a development environment on the new platform and documents every place the console differs. I take the CLI and get it into our build pipeline. We meet on the ninth of May to compare notes. I will write up what we found.

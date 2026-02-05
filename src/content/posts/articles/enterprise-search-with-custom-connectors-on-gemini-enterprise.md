---
title: "Enterprise search with custom connectors on Gemini Enterprise"
description: "How my team built permission-aware search for a wealth management firm: MCP connectors into CRM, SharePoint and BigQuery, citations on every answer, and an eval harness that runs before anything changes."
pubDatetime: 2026-02-04T15:00:00Z
kind: article
tags: ["rag", "gcp", "agents", "evals"]
sources:
  - title: "Google Cloud launches Gemini Enterprise"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
  - title: "OpenAI Codex app for macOS"
    url: "https://openai.com/index/introducing-the-codex-app/"
    date: 2026-02-02
---

## Table of contents

## The question that started it

A wealth management firm asked us a simple question in December. An advisor gets a call from a client. She needs to know the client's risk profile, the last three conversations, the current policy on a product, and the account balance. Today that is four systems and about eleven minutes. Can an agent answer in one place, and can it be trusted not to show her something she is not cleared to see.

The second half of that question is the whole project. Search is easy. Permission-aware search with citations is the work.

## Why we chose Gemini Enterprise over building retrieval ourselves

My default for enterprise RAG has been the blueprint I wrote about last year. Ingestion, hierarchical chunking, hybrid retrieval, reranking, cited generation. We own every piece. For this client I chose [Gemini Enterprise](https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise) instead, for two reasons.

First, access control. The firm has document-level permissions in SharePoint and record-level permissions in the CRM. Rebuilding that ACL model inside my own vector store is a project on its own, and it is a project where a single bug is a compliance incident. Gemini Enterprise carries source permissions through to retrieval. The advisor only sees results she could already open.

Second, the connector model. The platform expects you to plug in data sources rather than copy data out of them. That matched how the compliance team already thinks. Data stays where it lives. The agent visits.

The trade is control. I cannot tune the chunking strategy the way I can in my own pipeline. I accepted that for a client whose first requirement was "never show the wrong thing to the wrong person."

## Three connectors, three different problems

**CRM.** The firm runs a mainstream CRM with a REST API and per-record ownership. We wrote an MCP server that exposes three tools: look up a client, list recent interactions, and fetch notes for one interaction. Every call carries the advisor's identity, and the CRM enforces its own permissions. The agent never has broader access than the person asking.

**SharePoint.** Policies, product sheets, and compliance memos live here. This one used the platform's native connector with the firm's identity provider. The hard part was not technical. It was discovering that a third of the policy documents were duplicates with different dates, and the newest one was not always the correct one. We spent a week with the compliance team tagging the canonical version before we indexed anything.

**BigQuery.** Balances, holdings and transactions. Here I did not want free-text search at all. We built a small semantic layer: named metrics with fixed SQL, exposed as MCP tools with typed parameters. The agent can ask for "current balance for client X" and gets a number from a query a human wrote and reviewed. It cannot write its own SQL against production tables.

```python
# MCP tool exposed to the agent. The SQL is fixed. The agent chooses parameters only.
@tool(name="client_balance", description="Current total balance for one client id")
def client_balance(client_id: str, as_of: date | None = None) -> BalanceResult:
    return run_named_query("client_balance_v3", client_id=client_id, as_of=as_of)
```

That decision cost us some flexibility. It bought us a finance team that signed off in one meeting.

## Citations are a product requirement, not a nice touch

Every answer shows where it came from. A policy answer links to the document and the paragraph. A CRM answer names the interaction and its date. A balance names the query version and the as-of timestamp.

We made the agent refuse when it cannot cite. If the retrieval returns nothing above a relevance threshold, the answer is "I could not find a source for that" and a suggestion of who to ask. Advisors told us in the pilot that this refusal was the feature that made them trust the rest.

## The eval harness

Nothing about the retrieval configuration or the agent prompt changes without passing a fixed set of cases. We built around 180 of them with two advisors and one compliance officer over three weeks.

Each case has a question, the advisor identity to run it as, the documents or records that should be cited, and the ones that must not appear. The last part is the permission test. We run each case as a user who should see the answer and as a user who should not.

The scoring has four parts. Did the expected sources appear. Did any forbidden source appear. Was the answer grounded in the cited text, scored by a judge model that is not the one generating. Was the answer complete, scored by the same judge against a reference.

A forbidden source appearing is a hard fail. One case fails, the change does not merge. Everything else is a threshold.

## What went wrong

Two things.

The first was latency. The CRM API is slow, around two seconds for a notes lookup. When the agent decided to fetch notes for all five recent interactions, answers took twelve seconds. We added a summary tool that returns one line per interaction and only fetches full notes on request. Median answer time dropped under four seconds.

The second was the judge disagreeing with humans on completeness. The judge wanted more detail than advisors did. Advisors wanted the number and the source. We rewrote the rubric with the advisors' own words for what a good answer looks like, and agreement went up.

## What we kept from the blueprint

Choosing the platform did not mean throwing away what my team learned building retrieval by hand. Three pieces carried over.

The query rewrite step. Advisors type shorthand. "risk prof for the Hendersons" is not a search query. A small Gemini Flash call turns it into a structured request with a client identifier and an intent before anything is retrieved. That step lives in our ADK agent, in front of the platform.

The refusal threshold. The platform returns relevance scores. We set the floor from the eval set, not from a default. Below the floor the agent refuses rather than guessing.

The judge. Gemini Enterprise gives us grounded answers with citations. It does not tell us how often those citations actually support the sentence they are attached to. Our judge does. It runs on a five percent sample of live sessions every night and the groundedness score sits on the same dashboard as latency and cost.

## Where this sits now

The pilot ran with twelve advisors for six weeks. The eleven-minute lookup is under a minute for the common questions. Nobody has seen a record they were not cleared for, which is the metric the compliance officer actually tracks.

I noticed OpenAI released a [Codex desktop app](https://openai.com/index/introducing-the-codex-app/) this week. Different problem, same pattern I keep seeing. Tools that sit next to where people already work win over tools that ask people to move.

That is what this project was. The advisor did not get a new system. She got an answer, with a source, in the place she was already sitting.

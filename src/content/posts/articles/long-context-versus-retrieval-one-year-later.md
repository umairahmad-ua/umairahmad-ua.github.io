---
title: "Long context versus retrieval, one year later"
description: "Million-token windows are normal now. On enterprise data my team still retrieves. Cost, freshness, access control and evals explain why, with numbers from a legal client."
pubDatetime: 2026-06-03T15:00:00Z
kind: article
tags: ["rag", "agents", "evals"]
sources:
  - title: "Anthropic releases Claude Opus 4.8"
    url: "https://code.claude.com/docs/en/whats-new/2026-w22"
    date: 2026-05-28
  - title: "Microsoft Build 2026"
    url: "https://news.microsoft.com/build-2026-live-blog/microsoft-build-2026-live/"
    date: 2026-06-02
---

## Table of contents

## The question a client asked

A legal operations team at a mid-size insurer asked me in April why we still bother with retrieval. Their contract corpus is about 9,000 documents. Claude Opus 4.6 had a million-token beta window since February. Gemini has had long windows for longer. [Claude Opus 4.8](https://code.claude.com/docs/en/whats-new/2026-w22) arrived last week. "Just put the contracts in the prompt" was the sentence.

I wrote a version of this article in February when I described [the retrieval blueprint my team reuses](/posts/articles/the-rag-blueprint-i-reuse/). Four months and two model generations later the answer has not changed. The reasons have gotten sharper.

## Do the arithmetic first

Nine thousand contracts average about 11,000 tokens each. That is roughly 100 million tokens. A million-token window holds one percent of the corpus. So "put it all in the prompt" was never an option for this client. The real question was whether to put a lot in the prompt, say the 80 most relevant contracts, or to retrieve a handful of passages.

We measured both on the client's own review workload. The task is clause comparison. Given a new contract, find how the indemnity, limitation of liability and termination clauses differ from the insurer's standard positions and from precedent contracts with the same counterparty.

## The experiment

Same model, same prompt template, same 60 review cases with lawyer-graded answers. Two conditions.

**Long context.** A lightweight filter picked the 80 most likely relevant contracts by counterparty and contract type, and we put their full text in the prompt. Around 900,000 tokens per request.

**Retrieval.** Hierarchical chunking at the clause level with parent context, hybrid dense and sparse search, cross-encoder reranking, top 12 passages. Around 14,000 tokens per request.

| | Long context | Retrieval |
|---|---|---|
| Lawyer-graded accuracy | 81% | 84% |
| Groundedness (judge) | 8.2 | 8.9 |
| Median latency | 71 s | 6 s |
| Cost per review | ~$3.10 | ~$0.09 |
| Wrong-counterparty citations | 7 of 60 | 0 of 60 |

The accuracy gap is small and within what I would expect to move with a better prompt. Everything else is not close.

## Freshness

Contracts get amended. The long context condition works from whatever snapshot you loaded. With retrieval, the ingestion pipeline reindexes an amended contract within minutes and the next query sees it.

You can rebuild the long context snapshot on every query. Then you pay the assembly cost and the token cost every time, and you still need a filter to pick the 80 documents, which is retrieval by another name.

## Access control

This is the reason that ends the conversation with enterprise clients. Not every lawyer at the insurer may read every contract. Some are restricted to a deal team. In the retrieval architecture the search index carries the document ACL and the query runs as the user. A restricted contract is never a candidate.

In the long context architecture the filter has to enforce the ACL before assembly, and then the entire assembled prompt, with every restricted passage in it, goes to the model provider as one blob. The provider is not the problem. The audit trail is. When compliance asks what the model saw for a given request, "900,000 tokens" is not an answer they accept. "These 12 passages from these 9 documents, all of which the user was entitled to read" is.

## Evaluation

Retrieval gives you two things to evaluate separately. Did we retrieve the right passages. Did the model answer correctly given those passages. When a case fails you know which half failed.

Long context collapses that. When the answer is wrong, the model had the right document somewhere in the window and did not use it, or used the wrong one. The seven wrong-counterparty citations in our experiment were exactly this. The model picked an indemnity clause from a different counterparty's contract that happened to be in the window. Retrieval never presented that clause, so it could not be cited.

The insurer's lawyers cared about this failure more than any accuracy figure. A wrong citation to the wrong counterparty in a review memo is the kind of error that gets a vendor removed.

## Where long context wins

I am not arguing that long windows are useless. My team uses them every day, in three places.

Single-document tasks. Reviewing one 200-page contract end to end. There is nothing to retrieve. The whole document is the context.

Working memory for agents. The Scout orchestrator holds a long session with many tool results. Long windows let us summarize less often and lose less.

Bootstrap before an index exists. A new client with 300 documents and a demo on Friday. Load them, get a result, build the index next week.

The rule my team uses: long context for depth on one thing, retrieval for breadth across many things with rules about who may see what.

## Cost has not moved the line

Opus 4.8 last week, GPT-5.5 Instant in May, Fable 5 expected soon. Every release makes tokens cheaper. The ratio in the table above is about 35 to 1. If long context tokens fell by 90 percent tomorrow, retrieval would still be three times cheaper and ten times faster, and it would still be the only one that passes the compliance review.

Microsoft's [Build announcements](https://news.microsoft.com/build-2026-live-blog/microsoft-build-2026-live/) this week lean the same way. Agent 365 and Microsoft IQ are retrieval and permission layers over enterprise data, with long context models behind them. Nobody building for enterprises is skipping the index.

## What changed in a year

The retrieval side got better. Rerankers are cheaper and stronger. Hybrid search is the default in Vertex AI Search and in most vector stores. Hierarchical chunking is a checkbox, not a custom pipeline.

The long context side got better too, and that is the point I want to be honest about. The 81 percent accuracy in the long context condition would have been below 70 percent a year ago. Models are much better at finding a needle in a large window. What they are not better at is telling you which needle they found, or refusing to find one they should not see.

## Recommendation

For any corpus a user could not read in a week, retrieve. Attach ACLs to the index. Evaluate retrieval and generation separately. Use long context inside the retrieved set and for single-document depth.

The insurer kept retrieval. Their review memos cite the right counterparty every time, and the lawyers stopped asking why.

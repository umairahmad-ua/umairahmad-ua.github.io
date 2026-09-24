---
title: "Contract review agents for a legal team: clauses, obligations and a human gate"
description: "How my team built a contract intelligence system for a corporate legal group, from clause extraction to an obligation graph to a review screen lawyers actually use."
pubDatetime: 2025-12-03T15:00:00Z
kind: article
tags: ["agents", "rag", "evals"]
sources:
  - title: "AWS re:Invent 2025, AgentCore Policy and Evaluations preview"
    url: "https://www.aboutamazon.com/news/aws/aws-re-invent-2025-ai-news-updates"
    date: 2025-12-02
diagram:
  caption: "Clauses are extracted and lawyer-approved before an agent builds the obligation graph that finance queries with citations."
  nodes:
    - { id: "pdfs", label: "Vendor and customer PDFs", col: 0, kind: "source" }
    - { id: "docai", label: "Document AI layout", col: 1, kind: "tool" }
    - { id: "classifier", label: "Fine-tuned clause classifier", col: 1, kind: "model" }
    - { id: "extract", label: "Gemini structured clauses", col: 2, kind: "model" }
    - { id: "lawyer", label: "Lawyer approves clauses", col: 3, kind: "human" }
    - { id: "graph", label: "Obligation graph agent", col: 4, kind: "agent" }
    - { id: "pg", label: "PostgreSQL with pgvector", col: 4, kind: "store" }
    - { id: "qa", label: "Question answering agent", col: 5, kind: "agent" }
    - { id: "finance", label: "Finance quarterly question", col: 5, kind: "human" }
  edges:
    - ["pdfs", "docai"]
    - ["docai", "classifier"]
    - ["classifier", "extract", "clause type"]
    - ["extract", "lawyer", "page and span cited"]
    - ["lawyer", "graph", "approved only"]
    - ["lawyer", "classifier", "edits as few-shot"]
    - ["graph", "pg"]
    - ["pg", "qa"]
    - ["qa", "finance", "table with citations"]
---

## Table of contents

## Five thousand contracts and three lawyers

A corporate legal team at a mid-sized enterprise had a problem I have seen before in a different costume. Thousands of vendor and customer contracts, a handful of lawyers, and a quarterly question from finance: what are we obligated to pay, deliver or renew in the next ninety days?

The answer lived inside PDFs. Finding it meant a paralegal reading contracts for a week. Most quarters the answer was late and partly wrong.

This is document intelligence, which is where I started my career. It is also an agent problem, because the question is not "extract this field" but "read these documents and tell me what we owe." What follows is how we built it, and where the lawyers pushed back.

## Layer one: extraction, not generation

The first layer does not use an agent. It uses the extraction stack I have trusted for years, with a model upgrade.

Each contract goes through layout analysis to find sections, headers and tables. Clauses are segmented by type: term, termination, payment, renewal, liability, indemnification, confidentiality, governing law. A fine-tuned classifier assigns the type. Gemini then extracts a structured record per clause with a strict schema.

```python
class Clause(BaseModel):
    contract_id: str
    clause_type: Literal["term", "termination", "payment", "renewal",
                         "liability", "indemnity", "confidentiality", "law"]
    text: str
    page: int
    parties: list[str]
    dates: list[date]
    amounts: list[Money]
    conditions: list[str]   # "if notice not given 60 days prior"
```

Every extracted value carries the page number and a character span. A lawyer can click any field and land on the source text. This mattered more than any accuracy number. Lawyers do not trust summaries. They trust citations.

## Layer two: the obligation graph

Clauses are facts. Obligations are relationships between facts. "Auto-renews for twelve months unless either party gives sixty days notice" is a renewal clause, a term clause and a termination condition tied together.

The second layer is an agent that reads the clause records for one contract and produces an obligation graph. Nodes are obligations with a party, an action, a deadline and a trigger. Edges are dependencies. The renewal obligation depends on the notice condition, which depends on a date computed from the term end.

The agent has three tools: the clause store, a date calculator, and a lookup into the counterparty master data. It cannot search the web. It cannot read other contracts. The scope is one contract and its clauses.

The graph is stored in PostgreSQL with pgvector on the obligation text, so the third layer can search across all contracts semantically and structurally at once.

## Layer three: the question answering agent

This is the one finance talks to. "What renews in Q1?" "Which vendors can we terminate for convenience with under thirty days notice?" "Total committed spend with suppliers in the EU next year?"

The agent translates the question into structured filters on the obligation graph, runs them, then uses hybrid search over the clause text to catch anything the structured extraction missed. Results come back as a table with a citation per row. Every row links to a clause, which links to a page.

It also states what it is unsure about. Contracts with extraction confidence below a threshold appear in a separate "needs review" list rather than silently in the main table. Finance sees the certain answer and the uncertain remainder. That framing is what made them stop asking the paralegal to double check everything.

## The human gate

The legal team's condition for going live was simple. No obligation enters the graph until a lawyer has approved the clause extraction for that contract.

We built the review screen around that. A lawyer opens a contract and sees the extracted clauses down the left, the source PDF on the right, with spans highlighted. Approve, edit, reject per clause. Bulk approve for high-confidence clauses on standard templates.

The first month was slow. Every contract was new. By the third month, standard vendor templates were bulk-approved in minutes and lawyer time went to the bespoke contracts, which is where their time belongs.

Every edit is a training signal. Corrections feed back into the classifier and into the extraction prompts as few-shot examples for that clause type. Extraction quality on the client's specific templates improved month over month without us changing the base model.

## Where the lawyers pushed back

Risk scoring. My first design included a risk score per contract, a number from one to ten. The lawyers rejected it in the first review. A number implies a judgment, and a judgment from a system without a bar license is a liability. We replaced the score with a list of flagged clauses and the reason for each flag. Same information, no verdict. They accepted that.

Summaries. The agent originally produced an executive summary per contract. Lawyers read them, found them accurate, and asked us to remove them. A summary that is 95 percent right is a summary someone will rely on without reading the clause, and the 5 percent is where the lawsuits are. The summary is gone. The clause table and citations remain.

Both of these are the same lesson. In a regulated domain, the system's job is to make the human faster and better cited. Not to conclude.

## Evaluation

Three eval sets. Clause classification against a lawyer-labeled sample. Extraction field accuracy against the same sample, per field. Question answering against a set of finance questions with known answers from a quarter the paralegal had already done by hand.

The third set is the one the client cared about. The agent matched the manual answer on the large majority of questions and found several obligations the manual pass had missed. It also produced two wrong rows, both traced to a scanned contract with a bad OCR pass. Those went into the needs review list after we tightened the confidence threshold.

I noticed [AWS announced evaluation tooling for agents](https://www.aboutamazon.com/news/aws/aws-re-invent-2025-ai-news-updates) at re:Invent this week. We are on Google Cloud, so I read it as a signal rather than a tool. Every platform is converging on the same view. An agent without an eval set is a demo.

## Stack

Layout analysis with Document AI for scanned files and a PDF parser for native ones. A fine-tuned clause classifier on the client's labeled sample. Gemini for structured extraction with a strict response schema. PostgreSQL with pgvector for the obligation graph and clause embeddings. Elasticsearch with dense vectors for cross-contract search. A small FastAPI service in front of the review screen, deployed on Cloud Run. Evals run in Cloud Build on every prompt or schema change. Nothing exotic. The value is in the gate and the citations.

## What finance gets now

The quarterly question is answered in an afternoon. The answer comes with citations. The uncertain part is separated from the certain part. The paralegal reviews the uncertain part instead of reading everything.

The lawyers get a system that makes them faster and never speaks for them. That was the deal, and it is the only deal that works in this domain.

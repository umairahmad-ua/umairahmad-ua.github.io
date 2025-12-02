---
title: "Contract review agents for a legal team: clauses, obligations and a human gate"
description: "How my team built a contract intelligence system for a corporate legal group, from clause extraction to an obligation graph to a review screen lawyers actually use."
pubDatetime: 2025-12-03T15:00:00Z
kind: article
theme: industry
tags: ["agents", "rag", "evals"]
sources:
  - title: "AWS re:Invent 2025, AgentCore Policy and Evaluations preview"
    url: "https://www.aboutamazon.com/news/aws/aws-re-invent-2025-ai-news-updates"
    date: 2025-12-02
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


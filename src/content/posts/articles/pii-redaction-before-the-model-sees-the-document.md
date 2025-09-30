---
title: "PII redaction before the model sees the document"
description: "The redaction layer my team puts in front of every model call for regulated clients: DLP API, Presidio, reversible tokens, and how we test recall."
pubDatetime: 2025-10-01T15:00:00Z
kind: article
theme: tools
tags: ["security", "gcp", "healthcare", "agents"]
sources: []
---

## Table of contents

## The question every compliance officer asks

Every regulated client asks the same question in the second meeting. What does the model see?

For a healthcare payer, a bank, or an insurer, the honest answer used to be: the document. The whole document, with names, member IDs, account numbers, and dates of birth. That answer ends the meeting.

So my team built a redaction layer that sits in front of every model call. The model sees a document with the identifiers replaced by tokens. The agent does its work on tokens. The tokens are swapped back only when a human with the right role reads the output. This article is how it works and how we know it works.

## Two engines, not one

We run two detectors and take the union.

**Cloud DLP API** covers the structured identifiers. Social security numbers, credit card numbers, phone numbers, email addresses, member IDs that match a client-specific regex. DLP is fast and its info types are well tested. It is also what the client's own security team already knows.

**Presidio** covers the messy cases. Person names in free text, addresses written three different ways, dates that could be a birth date or an appointment date. Presidio runs a spaCy NER model plus pattern recognizers, and we can add custom recognizers for client-specific formats without waiting on anyone.

The two overlap on purpose. When both flag a span we take the wider boundary. When only one flags a span we still redact. The cost of a false positive is a token where a word used to be. The cost of a false negative is a compliance incident.

```python
def detect(text: str, ctx: ClientContext) -> list[Span]:
    dlp_spans = dlp_inspect(text, info_types=ctx.dlp_info_types)
    presidio_spans = analyzer.analyze(
        text=text, language="en", entities=ctx.presidio_entities
    )
    return merge_overlapping(dlp_spans + to_spans(presidio_spans))
```

## Reversible tokens

Replacing a name with `[PERSON]` breaks the downstream task. An agent reconciling a claim needs to know that the patient on page one is the same patient on page four. So we do not replace with a category. We replace with a stable token.

The first occurrence of "Maria Lopez" becomes `PERSON_a3f1`. Every later occurrence in the same document becomes the same token. A different name gets a different token. The mapping from token to original value is stored in a separate Cloud SQL table, encrypted, keyed by document and tenant, with an expiry.

The model now reasons about `PERSON_a3f1` as a consistent entity. When the agent's output reaches a human reviewer with the right role, a second service swaps the tokens back. The model provider never sees the mapping. Neither does the agent's log.

## What gets redacted depends on the task

A claims reconciliation agent needs dates of service. A marketing insight agent does not need any dates at all. So the redaction policy is per agent, not per client.

Each agent declares what it needs in a small policy file:

```yaml
agent: claims_reconciliation
keep:
  - DATE_OF_SERVICE
  - PROCEDURE_CODE
  - DIAGNOSIS_CODE
tokenize:
  - PERSON
  - MEMBER_ID
  - PHONE_NUMBER
  - EMAIL_ADDRESS
drop:
  - US_SSN
  - CREDIT_CARD
```

Keep means pass through. Tokenize means reversible. Drop means replaced with a category label and never stored in the mapping table at all. Nothing downstream of this agent should ever need a social security number, so nothing downstream can have one.


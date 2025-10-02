---
title: "PII redaction before the model sees the document"
description: "The redaction layer my team puts in front of every model call for regulated clients: DLP API, Presidio, reversible tokens, and how we test recall."
pubDatetime: 2025-10-01T15:00:00Z
kind: article
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

## Testing recall, not just running it

The layer is only useful if we can say how often it misses. We test three ways.

**Synthetic injection.** We take real documents that have already been redacted and reviewed, inject known synthetic identifiers into them at random positions, and measure how many the detectors catch. This runs on every change to the recognizers. Recall on injected identifiers is above 99.5 percent for structured types and above 97 percent for names.

**Human audit sample.** Every week a compliance analyst at the client reviews a random sample of fifty redacted documents. They mark anything that should have been caught. This is the number that matters to the client. It has found two real misses in four months, both handwritten annotations that OCR turned into unusual strings.

**Adversarial formats.** A member ID written as `MBR 1234 5678` instead of `MBR12345678`. A phone number with the area code on the previous line. We keep a growing test file of these. Every miss the audit finds becomes a permanent test case.

## Where the layer sits

The redaction service runs on Cloud Run and is called by every agent before the first model call. It is not optional and it is not inside the agent code. An agent developer on my team cannot forget to redact, because the model client they import routes through the service.

```
document -> OCR -> redaction service -> agent (tokens only) -> output -> re-identification (role gated) -> reviewer
```

The re-identification step has its own access log. Who saw which original values, when, and for which case. That log is what the compliance team actually reads.

## Handling what OCR does to identifiers

The two real misses the audit found were both OCR artifacts. A handwritten member ID became `M8R 1Z34 S678` after Document AI read it. No regex matches that. No NER model flags it. It reached the model as a meaningless string, which is arguably fine for privacy, but the compliance analyst rightly counted it as a miss because a person could still read it.

We added a third stage for scanned documents. Before detection, a Gemini call reads each OCR line that contains a suspicious mix of letters and digits and asks one question: could this be an identifier? Anything it flags gets tokenized as `UNKNOWN_ID_xxxx`. The stage costs a few cents per document and only runs on scanned input. Recall on handwritten identifiers in the audit sample moved from roughly 80 percent to above 95.

## Working with the client's security team

The layer only earned trust because the client's own security engineers could inspect it. We gave them read access to the recognizer configuration, the test corpus, and the weekly recall report. They added four custom patterns in the first month for internal identifier formats we had never seen. That collaboration is why the audit sample is fifty documents a week and not five hundred. They trust the tests because they wrote some of them.

## Costs and latency

Redaction adds about 400 milliseconds per page and a small DLP charge. For a batch workload nobody notices. For an interactive agent it is noticeable, so we redact at ingest time and cache the tokenized document. The agent never waits on redaction during a conversation.

## What this bought us

The second meeting with a regulated client now goes differently. We show the policy file, the audit sample results, and the access log. The compliance officer asks two questions instead of twenty. The project starts a month earlier.

The model was never the risk. The document was. Handle the document first.

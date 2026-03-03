---
title: "KYC document agent for a fintech: OCR, extraction and risk flags"
description: "How we built an onboarding agent that reads IDs and proofs of address, checks sanctions lists as a tool, and hands analysts a case they can decide in two minutes."
pubDatetime: 2026-03-04T15:00:00Z
kind: article
theme: industry
tags: ["agents", "gcp", "security", "evals"]
sources:
  - title: "OpenAI GPT-5.3 Instant"
    url: "https://openai.com/index/gpt-5-3-instant/"
    date: 2026-03-03
  - title: "Google Gemini 3.1 Flash-Lite"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-03-03
---

## Table of contents

## Eleven minutes per applicant

A consumer fintech came to us in November with a number. Each new applicant took an analyst eleven minutes on average. Most of that was reading. A passport or license, a utility bill or bank statement, a selfie, then three lookups in three tabs. The decision itself took under a minute.

The analysts were not slow. The work was. My team built an agent that does the reading and the lookups and leaves the decision where it was.

## The shape of the system

Four agents on Google ADK, one orchestrator, one review queue.

**Extraction agent.** Takes the uploaded documents and calls Document AI with the identity and proof-of-address processors. Returns typed fields: name, date of birth, document number, expiry, address, issuing authority. Every field carries a confidence score and the bounding box it came from.

**Verification agent.** Compares fields across documents. Does the name on the bill match the name on the ID within the tolerances we agreed. Is the address recent enough. Is the document expired. Each check is a small function, not a model call. The model decides which checks to run and reads the results.

**Risk agent.** Calls the sanctions and PEP screening provider through a typed tool. Calls the internal fraud model, which the client already had, through another. Assembles a risk summary with the reason for each flag.

**Case writer.** Produces the one-page case the analyst reads. Extracted fields with confidence, verification results, risk flags, and a recommended outcome with the rule that produced it.

```
orchestrator
├── extraction_agent      Document AI (ID, proof of address), Cloud Vision fallback
├── verification_agent    deterministic field checks, tolerance config
├── risk_agent            sanctions/PEP tool, internal fraud model tool
└── case_writer           typed case object -> analyst queue
```

The orchestrator never approves an applicant. It routes to one of three queues: clear, review, or escalate. Analysts work the review queue. Compliance works escalations. Clear cases still get sampled, ten percent, by a human every day.

## Stack

Google ADK on Vertex AI Agent Engine. Gemini 2.5 Flash for the extraction and case-writing steps, Gemini 2.5 Pro for the risk summary where the reasoning is longer. Document AI for OCR and field parsing. Cloud Storage with customer-managed encryption keys for uploads, with a seven-day retention on raw images. Firestore for case state. BigQuery for the analytics the compliance team wants. Pydantic models for every handoff between agents. Langfuse for traces. DLP API on every log line before it is written.

## The hard part was the false positives

Sanctions screening is a fuzzy name match against lists with millions of entries. Run it naively and a common name lights up a dozen flags. Analysts learn to ignore the flags, which is the worst possible outcome.

We did three things.

First, the risk agent passes more than the name. Date of birth and nationality from the extracted ID narrow the match set before the screening tool is called. The tool's own scoring improves when it has those fields.

Second, the agent explains each flag in one line. "Matched on surname only, different birth year, different country." The analyst reads the line and clears it in seconds instead of opening the record.

Third, we measured. Every cleared flag is a labeled example. After six weeks we had enough to tune the match threshold per list, with compliance signing off on each change. Flags per applicant dropped by more than half. The true positive rate, checked against compliance's own audit sample, did not move.


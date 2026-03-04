---
title: "KYC document agent for a fintech: OCR, extraction and risk flags"
description: "How we built an onboarding agent that reads IDs and proofs of address, checks sanctions lists as a tool, and hands analysts a case they can decide in two minutes."
pubDatetime: 2026-03-04T15:00:00Z
kind: article
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

## Handling documents the models have never seen

Document AI's identity processor covers common IDs well. The client onboards people from more than forty countries, and some national IDs and utility bill formats produced low-confidence fields or nothing at all.

We built a fallback path. When the processor's confidence on a required field is below threshold, the extraction agent sends the page image to Gemini 2.5 Pro with a strict schema and asks for the same fields with a bounding box for each. Those results are marked as model-extracted rather than processor-extracted, and the case page shows the analyst which path produced each value.

Model-extracted fields always route to the review queue. They never contribute to a straight-through clear. Over the pilot we collected those cases, and the client is now training a custom Document AI processor on the three formats that appear most. The fallback bought us coverage on day one. The custom processor is how the coverage becomes cheap.

## What the analysts see

A single page. Fields on the left with a green, amber or red dot for confidence. The document image on the right with the source box highlighted when you hover a field. Verification results as a short list. Risk flags with the one-line reason. A recommended outcome at the bottom with the rule name.

Two buttons. Accept the recommendation, or override with a reason. Overrides go back into the eval set every week.

Analysts asked for one thing we had not planned. A "show me why" link on the recommendation that expands the rule and the inputs. That link is now the most-clicked element on the page.

## Evaluating it

The eval set is four hundred historical applications with the analyst's final decision. We score extraction field accuracy against the analyst's corrections, verification agreement with the historical outcome, and, the one that matters most to compliance, escalation recall. Every case that was escalated historically must still be escalated. That is a hard gate. It cannot regress by a single case.

Prompt and tool changes run the full set in CI. Model swaps run it twice, with the judge for case quality being a different model from the one writing.

## Results after the pilot

The eleven minutes is under four for review cases. Straight-through rate for clear cases roughly doubled once compliance trusted the sampling. Escalation recall has held at one hundred percent on the eval set through every change.

Two cheaper models arrived this week, [GPT-5.3 Instant](https://openai.com/index/gpt-5-3-instant/) and [Gemini 3.1 Flash-Lite](https://en.wikipedia.org/wiki/Gemini_(language_model)). The case-writer step is the first place I will test one. It is the highest-volume, lowest-risk call in the system, and cost per applicant is the number the client's finance team asks about now that the compliance team is satisfied.

## What I would tell another team

Do not let the agent decide. Let it read, check, look up, and explain. The decision stays with a person and the agent's job is to make that person fast and confident. Measure escalation recall before anything else. Then measure false positives, because that is where analysts stop trusting you.

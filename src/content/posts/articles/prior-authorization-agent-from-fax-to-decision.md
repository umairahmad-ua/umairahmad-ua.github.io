---
title: "Prior authorization agent for a healthcare payer: from fax to decision"
description: "How my team built an agent that reads faxed prior authorization requests, checks them against payer policy, and hands a reviewer a decision they can defend."
pubDatetime: 2025-09-17T15:00:00Z
kind: article
tags: ["healthcare", "agents", "adk", "gcp"]
sources: []
diagram:
  caption: "From faxed request through Document AI, extraction and policy matching to a nurse reviewer who makes the decision."
  nodes:
    - { id: "fax", label: "Fax TIFF and PDF intake", col: 0, kind: "source" }
    - { id: "docai", label: "Document AI OCR", col: 1, kind: "tool" }
    - { id: "bert", label: "BERT code extractor", col: 2, kind: "model" }
    - { id: "gem", label: "Gemini free text extract", col: 2, kind: "model" }
    - { id: "checks", label: "Eligibility cross checks", col: 3, kind: "tool" }
    - { id: "vsearch", label: "Vertex AI Search policies", col: 3, kind: "store" }
    - { id: "manual", label: "Manual intake queue", col: 4, kind: "human" }
    - { id: "root", label: "ADK review agent", col: 4, kind: "agent" }
    - { id: "nurse", label: "Nurse reviewer screen", col: 5, kind: "human" }
    - { id: "audit", label: "BigQuery audit log", col: 5, kind: "store" }
  edges:
    - ["fax", "docai"]
    - ["docai", "bert", "text with bboxes"]
    - ["docai", "gem"]
    - ["bert", "checks", "PriorAuthRequest"]
    - ["gem", "checks"]
    - ["checks", "manual", "1 in 12 fails"]
    - ["checks", "root"]
    - ["vsearch", "root", "policy criteria"]
    - ["root", "nurse", "recommendation"]
    - ["nurse", "audit", "every click logged"]
---

## Table of contents

## The fax machine is still there

A regional health payer came to us in the summer with a problem I recognized. Prior authorization requests arrive by fax. Thousands a week. A clinician's office sends a request for a procedure, a nurse reviewer reads it, checks it against the payer's medical policy, and approves, denies, or asks for more information. The average turnaround was four business days. The regulator wanted two.

I had spent two years at Developers Inc on medical claims. That system reads more than 50,000 claims a day and cut rejections by 35 percent. Prior authorization is the same documents, one step earlier in the process. The codes are the same. The policy language is the same. The difference is that a claim is a fact about care that already happened. A prior auth is a judgment about care that has not happened yet. That judgment stays with a human. Our job was to get the human everything they need in one screen.

## What the agent does and does not do

The design rule from the first meeting: the agent never makes the final decision. It prepares one. A nurse reviewer sees the request, the extracted clinical facts, the matching policy criteria, and a recommendation with the evidence for each criterion. The nurse clicks approve, deny, or request information. Every click is logged with what the nurse saw.

That rule shaped everything. We were not building a decision engine. We were building a reviewer's assistant that has read the policy manual and the fax.

## The pipeline

Stack for this project:

- Document AI for OCR and layout on faxed PDFs
- A fine-tuned BERT model for ICD-10, CPT and NPI extraction, ported from the claims work
- Vertex AI Search over the payer's medical policy documents
- Google ADK for the review agent, running Gemini
- Cloud Run for the API, Pub/Sub for the queue, Firestore for case state
- BigQuery for the audit log and reporting
- Pydantic for every structured output

The flow has four stages.

**Ingest.** Faxes land as multi-page TIFFs or PDFs in a Cloud Storage bucket. Document AI returns text with bounding boxes. Fax quality is bad. Skewed pages, handwritten additions, cover sheets that belong to a different patient. We keep the bounding boxes so a reviewer can click any extracted fact and see where on the page it came from.

**Extract.** The BERT model pulls diagnosis codes, procedure codes, the requesting provider, the member ID, and dates. It was trained on claims, and prior auth forms use the same code sets, so the port was mostly new training data for the form layouts. A Gemini call handles the free text: the clinical justification paragraph, prior treatments tried, and anything the structured extractor missed. Both write into one Pydantic model.

```python
class PriorAuthRequest(BaseModel):
    member_id: str
    requesting_npi: str
    diagnosis_codes: list[CodeSpan]      # code + page + bbox
    procedure_codes: list[CodeSpan]
    clinical_justification: str
    prior_treatments: list[str]
    urgency: Literal["standard", "expedited"]
    extraction_confidence: float
```

**Match.** For each procedure code, the agent retrieves the relevant policy sections from Vertex AI Search. The payer's policies are long PDFs with numbered criteria. The agent turns each criterion into a yes, no, or unknown, with a quote from the request as evidence. Unknown is a valid answer. A criterion the fax does not address becomes a "request information" item, not a denial.

**Present.** The reviewer's screen shows the criteria table, the evidence quotes with page links, and the recommendation. The recommendation is one of three values and a short paragraph. Nothing else.

## The hard part was not the model

The model work took three weeks. The next two months went into three things.

**Confidence that means something.** Early on, the extractor reported 0.9 confidence on a member ID it had read off a cover sheet for a different patient. We added cross-checks: the member ID has to exist in the eligibility system, the provider NPI has to be active, the dates have to be in a plausible window. Failures drop the case into a manual intake queue before the agent touches it. About one request in twelve goes there.

**Policy versioning.** Medical policies change. A request evaluated on Tuesday against version 14 of a policy has to show version 14 forever, even after version 15 lands on Thursday. We snapshot the retrieved policy text into the case record. The audit log is the case record. Nothing is recomputed later.

**The review queue.** Nurses will not use a tool that slows them down. We spent two weeks with three reviewers watching them work. The result was a queue sorted by urgency and by how many criteria came back unknown. Cases with all criteria met go to the top and take a minute. Cases with three unknowns go to a nurse who specializes in that service line.

## Evaluation

We built the eval set from six months of historical requests with the nurse's decision attached. The agent's recommendation matched the historical decision on 91 percent of standard requests. That number is not the goal. The goal is that the 9 percent are visible and explained, and that the nurse can overrule in one click.

We also measure recall on the extraction separately. A missed procedure code is worse than a wrong recommendation, because the nurse may never see it. Extraction recall on codes sits above 98 percent on the held-out set. Every week the misses are reviewed and the worst category gets more training data.

## What changed for the payer

Median turnaround went from four business days to under one for standard requests. Expedited requests, which are a quarter of volume, are now handled the same day. The reviewers process more cases and spend their time on the hard ones.

The number I care most about is the overrule rate. Nurses change the agent's recommendation on about 8 percent of cases. If that number dropped to zero I would worry that they stopped reading. If it rose to 30 percent I would know the policy retrieval was broken. It has stayed between 6 and 10 for three months.

## How the agent is wired

For anyone building the same thing, the ADK structure is small. A root agent owns the case. It calls an extraction tool that wraps the BERT service, a policy retrieval tool that wraps Vertex AI Search, and a criteria evaluator that is a Gemini call with a strict output schema. There is no free-form planning loop. The root agent runs the three steps in order and stops. We tried a planning agent that decided which steps to run. It saved nothing and made the traces harder to read. A fixed sequence with typed handoffs is the right shape when the process itself is fixed by regulation.

## What I would do differently

I would build the reviewer screen first and the agent second. We built the agent first, and the first version of the screen showed too much. Nurses do not want the model's reasoning. They want the criteria, the evidence, and a button.

I would also budget more time for fax quality. Half our extraction errors trace back to the OCR stage, not the models downstream. Document AI is good. Faxes are worse.

The model is the easy part. Getting a regulated decision process to trust a recommendation is the work.

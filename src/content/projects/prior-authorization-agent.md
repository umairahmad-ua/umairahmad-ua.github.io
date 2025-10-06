---
title: "Prior authorization agent for a healthcare payer"
summary: "Reads faxed and portal requests, matches them against payer policy, drafts a decision with cited criteria, and routes anything uncertain to a nurse reviewer. Turnaround fell from days to hours."
role: "Lead, team of 4"
org: "Zazmic, regional health plan"
period: "Sep 2025 to Mar 2026"
stack: ["Google ADK", "Gemini 2.5 Pro", "Document AI", "Vertex AI Search", "Vertex AI Agent Engine", "BigQuery", "Cloud Run", "DLP API", "Pydantic", "Langfuse", "RAGAS", "Pub/Sub"]
order: 12
featured: true
---

Requests arrive as faxes, PDFs and portal forms. Document AI extracts the clinical fields, a policy agent retrieves the matching coverage criteria and a decision agent drafts the outcome with every criterion cited. Anything below a confidence threshold, or any denial, goes to a nurse. About 60 percent of routine approvals now clear without a human touching them. The nurses spend their time on the cases that need judgment.

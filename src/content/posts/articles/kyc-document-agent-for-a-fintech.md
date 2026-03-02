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


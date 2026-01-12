---
title: "A clinical documentation assistant that never writes the diagnosis"
description: "How we built an ambient note-drafting assistant for a healthcare client with hard boundaries on what it will and will not write, and why the boundaries are the product."
pubDatetime: 2026-01-14T15:00:00Z
kind: article
theme: industry
tags: ["healthcare", "agents", "gcp"]
sources:
  - title: "OpenAI introduces ChatGPT Health"
    url: "https://openai.com/index/introducing-chatgpt-health/"
    date: 2026-01-07
  - title: "Anthropic unveils Claude for Healthcare"
    url: "https://fortune.com/2026/01/11/anthropic-unveils-claude-for-healthcare-and-expands-life-science-features-partners-with-healthex-to-let-users-connect-medical-records/"
    date: 2026-01-11
---

## Table of contents

## Two launches and one client

In the space of five days, OpenAI launched [ChatGPT Health](https://openai.com/index/introducing-chatgpt-health/) and Anthropic launched [Claude for Healthcare](https://fortune.com/2026/01/11/anthropic-unveils-claude-for-healthcare-and-expands-life-science-features-partners-with-healthex-to-let-users-connect-medical-records/). Both aimed at patients and providers. Both careful in their language about what the models will and will not do.

My team has been building a clinical documentation assistant for a healthcare client since October. The two launches did not change our architecture. They did confirm the one decision we argued about most. The assistant drafts the note. It never writes the diagnosis.

## The use case

A clinician sees a patient for fifteen minutes and spends ten more writing the note. Multiply by twenty patients a day. The client wanted that ten minutes back.

The assistant listens to the visit with consent, transcribes it, and drafts a structured note in the clinic's template. Chief complaint, history, examination findings as stated, plan as discussed. The clinician reviews, edits and signs. Nothing enters the record without the signature.

That description hides the hard part. The hard part is the list of things the assistant refuses to do.

## The boundaries

The assistant will not write a diagnosis the clinician did not say out loud. If the transcript has symptoms and an exam but no stated diagnosis, the diagnosis field stays empty with a marker that says so.

It will not suggest a medication or a dose. If the clinician says "we will start the usual," the note records "we will start the usual" and flags the line for the clinician to complete.

It will not infer a value that was not spoken. If the blood pressure was measured but not said aloud, the field is blank. The assistant does not have access to the device data in this deployment, and we did not want a note that looked complete but was assembled from two sources without saying so.

It will not summarize across visits. Each note is drafted from one transcript only. Longitudinal reasoning is the clinician's job.

Every boundary is enforced in two places. In the prompt, as an instruction. And in a post-processing validator that checks the draft against the transcript and blanks any field whose content cannot be traced to spoken words. The prompt is the first line. The validator is the one we trust.


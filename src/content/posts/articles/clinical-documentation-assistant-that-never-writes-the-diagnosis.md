---
title: "A clinical documentation assistant that never writes the diagnosis"
description: "How we built an ambient note-drafting assistant for a healthcare client with hard boundaries on what it will and will not write, and why the boundaries are the product."
pubDatetime: 2026-01-14T15:00:00Z
kind: article
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

## The stack

```text
Capture          Consent prompt in the clinic app, audio to Cloud Storage in the client's project
Transcription    Gemini audio for the primary pass, Whisper as a fallback for noisy rooms
Speaker roles    Diarization plus a small classifier for clinician vs patient turns
Drafting         Gemini with the clinic's note template as a structured output schema
Validation       Span alignment between every drafted field and the transcript
Redaction        DLP API on transcripts before anything leaves the client project
Review UI        Side by side transcript and draft, one click to accept a field
Audit            Every draft, edit and signature logged with who, when, what changed
Evaluation       Judge on faithfulness to transcript, plus clinician edit distance per field
```

Everything runs inside the client's own Google Cloud project. The model calls stay in region. No transcript leaves. That was a requirement before the first line of code.

## Faithfulness, not accuracy

We do not evaluate the assistant on whether the note is medically correct. That is not its job and we are not qualified to judge it. We evaluate faithfulness. Does every sentence in the draft trace to something said in the visit.

The judge scores each field. Our gate is that no field may contain a claim without a transcript span behind it. During development the drafting model was very good at producing plausible exam findings that were never spoken. "Lungs clear to auscultation" appeared in drafts for visits where nobody examined the lungs. The validator catches this. The prompt alone did not.

The other metric is clinician edit distance per field. How much did the clinician change before signing. High edit distance on a field means the draft is not helping. The plan section had the highest edit distance for the first two months. Clinicians say the plan in shorthand and the model was expanding it into full sentences they then cut back down. We changed the instruction to preserve the clinician's phrasing. Edit distance on that field dropped by more than half.

## Consent and the recording itself

Before any of the model work matters, there is the recording. The clinic app asks the patient for consent at the start of every visit, in plain words, and records the answer. If consent is declined, the assistant does not run and the clinician writes the note the old way. About one patient in twelve declines. That number has not moved since October, and we have not tried to move it.

The audio goes to a bucket in the client's project with a retention rule. Once the note is signed, the audio is deleted. The transcript stays for the audit period, redacted. We argued about keeping audio longer for model improvement and decided against it. The assistant improves from clinician edits, not from replaying visits.

Noisy rooms were a real problem. Exam rooms have running water, door knocks and a second conversation in the hallway. The primary transcription pass handles most of it. When the diarizer's confidence drops below a threshold, the audio goes through a second pass and the two transcripts are aligned. Fields drafted from low-confidence segments get a visual marker in the review UI so the clinician knows to check them.

## The review that actually happens

A note-drafting assistant lives or dies on whether clinicians actually review the draft or just click sign. We watched for this from the first week. The audit log records time spent on the review screen and which fields were opened.

Median review time settled around ninety seconds. That is not nothing, and it is not the ten minutes they used to spend writing. The fields opened most often were plan and assessment. The fields opened least were chief complaint and history, which are also the fields with the lowest edit distance. That pattern reassures me. People are looking where the risk is.

We also added one deliberate friction. The sign button is disabled until every flagged field has been opened. A flagged field is one the validator blanked or the diarizer marked low confidence. Clinicians complained about this in week two. By week six nobody mentioned it. The flags are fewer now because the drafts are better, and the ones that remain are the ones worth a look.

## What the launches got right

Both the OpenAI and Anthropic healthcare products lead with what the model will not do. Neither claims to diagnose. Both route the person back to a clinician. I read that as the industry landing on the same conclusion my client reached in October. In this domain the boundaries are the product. A documentation assistant that is ninety-eight percent faithful and occasionally invents a finding is worse than no assistant, because the two percent is where the harm is.

## What I would tell another team

Build the validator before the prompt. Decide the refusal list with clinicians, not engineers, and write it down with names and dates. Measure edit distance per field from the first week. Keep every byte in the client's project.

And put the diagnosis field last in the template, empty by default, with the clinician's cursor waiting in it. The assistant saved them ten minutes. That field is the one they should spend some of it on.

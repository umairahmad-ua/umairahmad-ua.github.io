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


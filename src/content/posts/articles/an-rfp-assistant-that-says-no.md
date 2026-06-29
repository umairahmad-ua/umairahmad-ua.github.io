---
title: "An RFP assistant that says no: go/no-go scoring with agents"
description: "I first built a proposal assistant three years ago. Rebuilding it on ADK taught me the most useful thing it can do is tell us not to bid."
pubDatetime: 2026-07-01T15:00:00Z
kind: article
theme: industry
tags: ["agents", "adk", "gcp"]
sources:
  - title: "Anthropic releases Claude Sonnet 5"
    url: "https://www.anthropic.com/news/claude-sonnet-5"
    date: 2026-06-30
  - title: "Google ADK Go 2.0 GA"
    url: "https://developers.googleblog.com/announcing-adk-go-20/"
    date: 2026-06-30
  - title: "Redeploying Fable 5"
    url: "https://www.anthropic.com/news/redeploying-fable-5"
    date: 2026-06-30
---

## Table of contents

## The first version

In 2023 I built a proposal assistant at Developers Inc. It parsed an RFP, pulled matching past projects from a FAISS index, and drafted technical and financial sections with GPT-4. It also tailored resumes to the requirements and drafted the cover email. It saved days per proposal.

It had one flaw I did not see at the time. It always said yes. Feed it any RFP and it produced a confident, well-formatted proposal. The go/no-go decision was a score it printed at the top, and everyone ignored the score because the draft below it looked ready to send.

We bid on things we should not have bid on. Not because the tool told us to, but because the tool made bidding cheap and saying no still felt expensive.

This year my team rebuilt it on ADK for Zazmic's own use. The first design decision was that the assistant does not draft anything until a human has seen the no-go case and overruled it.

## What a no-go actually depends on

I sat with our delivery leads and asked what makes them decline work. The list was shorter than I expected.

- The client wants a fixed price for something with unbounded discovery.
- The timeline assumes a team we do not have free.
- The technical scope has a hard requirement we have never delivered, and the RFP gives no room to partner.
- The evaluation criteria weight things we are weak on, like on-shore headcount.
- The incumbent is named or obvious, and the RFP reads like it was written for them.

None of these are about whether we can write a good proposal. They are about the shape of the engagement. So the scoring agent scores the shape.


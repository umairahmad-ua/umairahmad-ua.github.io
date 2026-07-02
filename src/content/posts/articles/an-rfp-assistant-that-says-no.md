---
title: "An RFP assistant that says no: go/no-go scoring with agents"
description: "I first built a proposal assistant three years ago. Rebuilding it on ADK taught me the most useful thing it can do is tell us not to bid."
pubDatetime: 2026-07-01T15:00:00Z
kind: article
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

## The agent structure

Five agents under an orchestrator. The orchestrator is not allowed to call the drafting agents until the decision gate has been passed.

```
rfp_orchestrator
├── intake_agent          parse PDF/DOCX, extract requirements, deadlines, criteria
├── evidence_agent        pull matching past projects, team availability, certifications
├── risk_scoring_agent    score the five no-go dimensions, cite evidence
├── [human decision gate]
├── drafting_agent        technical + management sections, per-section generation
└── tailoring_agent       resumes and cover letter aligned to criteria
```

Intake runs on Gemini through ADK. It produces a typed requirements object. Every requirement has an identifier, the page it came from, and whether it is mandatory or scored. We learned early that "mandatory" and "scored" are different lists in most RFPs and the model would merge them unless the schema forced the split.

The evidence agent has tools. One tool queries our past-project store, which is a BigQuery table with embeddings in Vertex AI Search. One queries the staffing calendar through an MCP server we wrote. One checks our certification registry. This agent does no reasoning about fit. It gathers.

The risk scoring agent is the interesting one. It scores each of the five dimensions from one to five and, for each score, must cite a requirement identifier and a piece of evidence. A score without a citation is rejected by the schema. This is what makes the no-go case readable. A delivery lead sees "timeline: 5 of 5 risk, requires eight-week delivery (R-14, p. 3), current bench shows first availability in week 6 (staffing tool)".

## The gate

The gate is a page. It shows the five scores, the citations, and a one paragraph recommendation. There are two buttons. Decline, and proceed with drafting. Proceed asks for a reason in a text field, and that reason is stored with the proposal.

We added the reason field because of a pattern from version one. People overrode the score without saying why, and six months later nobody could reconstruct the decision. Now every overrule has a sentence attached. Reading those sentences after the fact has been more useful than the scores.

Drafting only starts after the button. The drafting agent works section by section. Each section gets the relevant requirements, the matching evidence, and our house style. It does not see the whole RFP. That was deliberate. A drafting agent that sees everything writes generic text that gestures at everything. A drafting agent that sees three requirements writes specific text about three requirements.

## What the numbers looked like

Since the rebuild went into use in the spring, the scoring agent has recommended no-go on a little under half of incoming RFPs. Delivery leads overruled about one in five of those. Of the ones we declined, I know of two we would have bid on under the old system, and I am glad we did not.

Drafting time for a proposal that passes the gate is now about a day of human review on top of the agent's output, down from three or four days of writing. The bigger saving is the proposals we never wrote.

## Model choices this week

Anthropic released Claude Sonnet 5 yesterday with a native one million token context. The same day Fable 5 came back to non-US users after the export control pause. I read both announcements with the RFP assistant in mind, because a long RFP with appendices can run to several hundred pages.

My current position is that long context does not change the intake design. We still extract typed requirements, because the downstream agents need identifiers to cite, not a giant blob. Where long context helps is the risk scoring agent. It can now hold the whole requirements object, all evidence and the full RFP text at once, and cross-check citations against the source. We are testing that this week with Sonnet 5 as the scoring model and Gemini for intake.

Google also made ADK for Go generally available yesterday. Our orchestrator stays in Python. But the staffing MCP server was written in Go by one of the engineers I lead and mentor, and having ADK in the same language means that team can build small agents without switching stacks.

## The part I got wrong the first time

Version one optimized for output. Every feature made it easier to produce a proposal. Version two optimizes for the decision. Most features make it easier to see why we should not produce one.

An assistant that always says yes is a very expensive way to say nothing. The useful version is the one that costs us a bid we would have lost.

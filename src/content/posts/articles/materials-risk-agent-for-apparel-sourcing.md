---
title: "Materials risk agent for apparel sourcing"
description: "How my team built an agent that watches fabric lead times, supplier signals and port delays for an apparel manufacturer, and tells planners only what they need to act on."
pubDatetime: 2026-03-25T15:00:00Z
kind: article
theme: industry
tags: ["supply-chain", "agents", "gcp"]
sources:
  - title: "Mistral Small 4"
    url: "https://mistral.ai/news/mistral-small-4/"
    date: 2026-03-16
  - title: "Claude Code auto mode research preview"
    url: "https://code.claude.com/docs/en/whats-new/2026-w13"
    date: 2026-03-23
---

## Table of contents

## The fabric that did not arrive

In February a planner at our apparel client found out on a Monday that a denim order for a Levi's program was going to miss its cut date. The fabric mill in Pakistan had pushed the ship date by eleven days. The mill had emailed a week earlier. The email went to a shared inbox that nobody had opened since the previous Thursday.

The client makes apparel in India, Bahrain, Jordan and Bangladesh. Their buyers include GAP and Levi's. Every style depends on fabric, trims and labels from dozens of suppliers, and every one of those suppliers communicates in a different way. Some send EDI. Some send PDFs. Some send a WhatsApp message to the sourcing manager.

The planners were not missing information. They were drowning in it. So the brief for my team was not "predict disruptions." It was "make sure the eleven-day slip gets read on the day it arrives, and only tell us about the ones that matter."

## What the agent watches

We built a materials risk agent that runs on a schedule and on events. It watches four kinds of signal.

**Supplier communications.** Emails, PDFs and portal exports land in Cloud Storage. A Document AI step extracts dates, quantities and purchase order references. Gemini reads the free text for anything that looks like a delay, a substitution or a quality hold.

**Supplier lead time history.** Every purchase order and receipt for the last three years sits in BigQuery. The agent compares the promised date on each open order against the supplier's actual record for that fabric type and that season.

**Logistics signals.** Port congestion and vessel schedule feeds for the routes the client uses. Chittagong, Jebel Ali, Nhava Sheva, Aqaba. A three-day queue at one port changes the risk on forty open orders.

**Production plan.** The cut dates from the planning system, so the agent knows which fabric is needed when. A slip on fabric due in nine weeks is information. A slip on fabric due in nine days is an alert.

The stack is not exotic. Cloud Scheduler and Pub/Sub trigger the runs. Cloud Run hosts the agent, built on Google ADK. BigQuery holds the history and the plan. Gemini does the reading. Looker shows the results. The hard part was never the tools.


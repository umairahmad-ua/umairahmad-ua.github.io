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

## How the agent decides what matters

Early on we let the model score risk directly. Give it the order, the supplier history, the port status, and ask for a risk level. It produced confident labels and planners stopped trusting them within a week. The model called a two-day slip on a low-priority trim "high risk" because the supplier email used the word "urgent."

We changed the design. The model reads and extracts. Deterministic code decides.

```python
def risk_for_order(order, supplier_stats, port_status, plan):
    days_to_need = (plan.cut_date(order.style) - order.promised_date).days
    expected_slip = supplier_stats.p80_slip_days(order.supplier, order.material)
    port_delay = port_status.queue_days(order.route)
    buffer = days_to_need - expected_slip - port_delay
    if buffer < 0:
        return "act", buffer
    if buffer < 5:
        return "watch", buffer
    return "ok", buffer
```

A signal from an email adjusts `order.promised_date`. A port queue adjusts `port_delay`. The rule that turns those numbers into "act" or "watch" is twenty lines of Python that a planner can read. When a planner asks why an order is flagged, the answer is a subtraction, not a paragraph.

The model earns its place at the edges. It reads a mill's email in Urdu and English mixed and pulls out the new date. It notices that a "quality hold pending lab test" means the shipment will not move for a week even though no new date was given. Those are language tasks. Risk is arithmetic.


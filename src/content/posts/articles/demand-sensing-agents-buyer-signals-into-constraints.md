---
title: "Demand sensing agents: turning buyer signals into constraints"
description: "Buyer forecasts arrive as spreadsheets, POS data arrives late, and promotions arrive as rumors. How our demand sensing agents turn all of it into constraints a solver can use."
pubDatetime: 2026-07-29T15:00:00Z
kind: article
theme: industry
tags: ["supply-chain", "agents", "gcp"]
sources:
  - title: "MCP specification 2026-07-28"
    url: "https://blog.modelcontextprotocol.io/posts/2026-07-28/"
    date: 2026-07-28
  - title: "Anthropic releases Claude Opus 5"
    url: "https://code.claude.com/docs/en/whats-new/2026-w30"
    date: 2026-07-24
---

## Table of contents

## Where demand actually comes from

The apparel manufacturer my team works with supplies GAP and Levi's from plants in India, Bahrain, Jordan and Bangladesh. Demand for them is not a number. It is a set of signals that disagree with each other.

The buyers send forecast files. Each buyer has a different template, a different horizon and a different idea of what a week is. Point of sale data arrives from some buyers with a lag of days and from others not at all. Promotions are announced late, sometimes after the fabric has been cut. And the planners carry a layer of knowledge in their heads about which buyers over-forecast and by how much.

Before agents, a planner spent the first two days of each week turning those signals into one demand plan. The rest of the week went to reconciling that plan against capacity. I wrote about the capacity side earlier this month. This is the demand side.

## The design principle

Demand sensing agents do not forecast. Forecasting models forecast. The agents gather signals, run the models as tools, reconcile the outputs and produce constraints for the allocation solver.

That split matters. A language model is good at reading a buyer's spreadsheet with a new column and understanding what it means. It is bad at producing a numerically calibrated forecast. So the model does the reading and the reconciling, and Prophet and XGBoost do the numbers.


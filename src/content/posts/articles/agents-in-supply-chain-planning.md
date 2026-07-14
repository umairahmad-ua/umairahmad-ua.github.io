---
title: "Agents in supply chain planning: forecasts as constraints"
description: "How we built planning agents for an apparel manufacturer across four countries, and why the solver, not the model, sits at the center."
pubDatetime: 2026-07-19T15:00:00Z
kind: article
theme: industry
tags: ["supply-chain", "agents", "gcp"]
sources: []
---

## Table of contents

## Four plants, one spreadsheet

The client makes apparel in India, Bahrain, Jordan and Bangladesh. Their buyers include GAP and Levi's. Every week the buyers send updated forecasts. Every week a small team of planners reconciles those forecasts against plant capacity, fabric availability and shipping windows, in spreadsheets, by hand.

When a forecast moved, the planners moved with it. A late fabric shipment in Jordan meant reallocating orders to Bangladesh, which meant checking whether Bangladesh had the trims, which meant a phone call. The plan was always a week behind the data.

That was the problem we were asked to help with at Zazmic. This is how we built the planning agents, and why the most important component is not a language model.


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

## What I brought from Algo

I did supply chain before I did agents. From 2022 to 2023 I was a data scientist at Algo in Michigan, building forecasting and inventory systems for retail and e-commerce clients.

Two results from that time shaped this project. First, a demand forecasting engine that combined Prophet, LSTM and gradient boosted models with more than forty external signals. Weather, promotions, holidays, macro indicators. It improved forecast accuracy by 18 percent against the client's previous method. Second, an inventory optimization solver, a mixed integer program that turned forecasts into replenishment plans across warehouses. It cut carrying costs by 30 percent.

The lesson from Algo that mattered most here: the forecast is not the plan. The forecast is an input to an optimization, and the optimization is where the business rules live. A better forecast with a bad allocation is still a bad plan.

So when the apparel client asked for agents, I did not start with agents. I started with the solver.


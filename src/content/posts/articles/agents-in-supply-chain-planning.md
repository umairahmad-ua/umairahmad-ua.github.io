---
title: "Agents in supply chain planning: forecasts as constraints"
description: "How we built planning agents for an apparel manufacturer across four countries, and why the solver, not the model, sits at the center."
pubDatetime: 2026-07-19T15:00:00Z
kind: article
tags: ["supply-chain", "agents", "gcp"]
sources: []
diagram:
  caption: "Three ADK agents propose constraint changes, a policy gate filters them, and the OR-Tools solver decides the plan."
  nodes:
    - { id: "inputs", label: "Buyer files, plant reports", col: 0, kind: "source" }
    - { id: "demand", label: "Demand sensing agent", col: 1, kind: "agent" }
    - { id: "cap", label: "Capacity agent", col: 1, kind: "agent" }
    - { id: "mat", label: "Materials risk agent", col: 1, kind: "agent" }
    - { id: "staging", label: "Staging table with reasoning", col: 2, kind: "store" }
    - { id: "orch", label: "Planning orchestrator", col: 3, kind: "agent" }
    - { id: "planner", label: "Planner decides", col: 3, kind: "human" }
    - { id: "solver", label: "OR-Tools CP-SAT on Cloud Run", col: 4, kind: "tool" }
    - { id: "plan", label: "Plan plus narration", col: 5, kind: "output" }
  edges:
    - ["inputs", "demand"]
    - ["inputs", "cap"]
    - ["inputs", "mat"]
    - ["demand", "staging", "constraint weights"]
    - ["cap", "staging", "capacity table"]
    - ["mat", "staging", "material_ok inputs"]
    - ["staging", "orch"]
    - ["orch", "planner", "outside policy"]
    - ["orch", "solver", "inside policy"]
    - ["planner", "solver", "approved changes"]
    - ["solver", "plan"]
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

## The solver is the center

The core of the system is an allocation model. It decides which orders go to which plant in which week. It is written with OR-Tools, Google's optimization library, and it runs as a plain service on Cloud Run with no language model in the loop.

Here is a stripped-down version of the shape of it, using the CP-SAT solver:

```python
from ortools.sat.python import cp_model

def allocate(orders, plants, weeks, capacity, material_ok, lead_ok):
    m = cp_model.CpModel()
    x = {}
    for o in orders:
        for p in plants:
            for w in weeks:
                x[o, p, w] = m.NewBoolVar(f"x_{o}_{p}_{w}")

    # each order is placed exactly once
    for o in orders:
        m.AddExactlyOne(x[o, p, w] for p in plants for w in weeks)

    # plant capacity per week, in standard minutes
    for p in plants:
        for w in weeks:
            m.Add(
                sum(orders[o].minutes * x[o, p, w] for o in orders)
                <= capacity[p, w]
            )

    # materials and lead time are hard constraints, not preferences
    for o in orders:
        for p in plants:
            for w in weeks:
                if not material_ok(o, p, w) or not lead_ok(o, p, w):
                    m.Add(x[o, p, w] == 0)

    # minimize cost plus a penalty for finishing after the buyer's window
    m.Minimize(
        sum(
            (orders[o].cost[p] + orders[o].late_penalty(w)) * x[o, p, w]
            for o in orders for p in plants for w in weeks
        )
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60
    status = solver.Solve(m)
    return status, {k: solver.Value(v) for k, v in x.items()}
```

The real model has more to it. Setup costs when a line switches styles, minimum lot sizes, shipping consolidation. But the shape is the same. Everything the planners used to hold in their heads becomes a constraint or a cost term.

## Forecasts become constraints

This is the idea in the title. The buyer's forecast does not go into the solver as a target to hit. It goes in as a set of constraints and penalties.

A firm order for 40,000 units in week 32 is a hard constraint. A forecast of 60,000 units in week 36 that is still two revisions from firm is a soft constraint with a penalty for under-planning and a smaller penalty for over-planning. The penalty weights come from the buyer's history of revising upward or downward. A buyer who always revises down gets a lower over-planning penalty.

That translation, from a forecast with a confidence to a constraint with a weight, is where the demand sensing agent does its work.

## Where the agents fit

Three specialist agents sit around the solver, coordinated by one planning orchestrator. All of them run on Google's ADK on the Gemini Enterprise Agent Platform. None of them are allowed to change the plan directly.

The demand sensing agent reads incoming buyer files, which arrive as spreadsheets, PDFs and emails in inconsistent formats. It extracts the forecast, compares it to the previous revision, and proposes updated constraint weights. It writes those to a staging table with its reasoning.

The capacity agent watches plant reports and maintenance schedules. When a line goes down in Bahrain, it proposes a revised capacity table for the affected weeks. Again, to staging, with reasoning.

The materials risk agent tracks fabric and trim shipments against the orders that need them. When a shipment slips, it flags which orders lose material feasibility in which weeks and proposes the change to the `material_ok` function's inputs.

The orchestrator collects these proposals, decides which are inside policy, applies those to the solver inputs, and re-runs the allocation. Anything outside policy stops and waits for a planner. A capacity change under 10 percent is inside policy. A change that moves a firm order between countries is not.

## Agents narrate, they do not decide

The most important design rule: the language models explain, the solver decides.

When the solver produces a new plan, the orchestrator generates a narration for the planners. It says what changed since the last run, why, and what it cost. "Orders 4471 and 4472 moved from Jordan to Bangladesh week 34 because the fabric shipment for Jordan slipped eight days. This adds an estimated two days to delivery. The alternative, keeping them in Jordan and accepting a late penalty, was more expensive."

That paragraph is a model output. The decision it describes is a solver output. The planners can trace every sentence back to a constraint or a cost term. That traceability is why they trust it. When a language model made the allocation directly in an early prototype, the planners could not tell why it chose what it chose. They stopped using it in a week.

## What the planners do now

The planners still plan. They spend their time on the decisions that stop at the policy gate: moving firm orders across borders, negotiating window changes with buyers, deciding whether to pay for air freight. The reconciliation work, the part that used to take most of the week, runs every night.

They also argue with the narration, which I count as a success. When a planner says "that is wrong, Bangladesh cannot take that style," it usually means a constraint is missing from the model. We add it. The plan gets better because the planners are correcting a model they can read.

## What I would do differently

I would put the narration in front of planners earlier. We spent our first month on the solver and the agents and only then showed the planners the explanations. They found gaps in the constraints immediately. We could have had those gaps a month sooner.

I would also be stricter about the policy gate from day one. We started permissive and tightened. It should have been the other way around.

The rest I would keep. A solver at the center. Agents that read the world and propose. A human who decides anything the policy does not cover. Forecasts as constraints. That structure held up through two buyer seasons and a plant outage, and I expect it to hold up through the next one.

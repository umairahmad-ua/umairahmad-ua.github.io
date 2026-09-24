---
title: "Demand sensing agents: turning buyer signals into constraints"
description: "Buyer forecasts arrive as spreadsheets, POS data arrives late, and promotions arrive as rumors. How our demand sensing agents turn all of it into constraints a solver can use."
pubDatetime: 2026-07-29T15:00:00Z
kind: article
tags: ["supply-chain", "agents", "gcp"]
sources:
  - title: "MCP specification 2026-07-28"
    url: "https://blog.modelcontextprotocol.io/posts/2026-07-28/"
    date: 2026-07-28
  - title: "Anthropic releases Claude Opus 5"
    url: "https://code.claude.com/docs/en/whats-new/2026-w30"
    date: 2026-07-24
diagram:
  caption: "Agents read buyer files and signals, run forecast models as tools, reconcile with planner history, and emit constraints for the solver."
  nodes:
    - { id: "buyers", label: "Buyer forecast files", col: 0, kind: "source" }
    - { id: "pos", label: "POS, promo, weather", col: 0, kind: "source" }
    - { id: "intake", label: "Intake agent", col: 1, kind: "agent" }
    - { id: "signal", label: "Signal agent", col: 1, kind: "agent" }
    - { id: "forecast", label: "Forecast agent, Prophet, XGB", col: 2, kind: "agent" }
    - { id: "bias", label: "Buyer bias, overrides", col: 2, kind: "store" }
    - { id: "reconcile", label: "Reconcile agent (Opus 5)", col: 3, kind: "agent" }
    - { id: "constraint", label: "Constraint agent", col: 4, kind: "agent" }
    - { id: "planner", label: "Planner review page", col: 4, kind: "human" }
    - { id: "solver", label: "OR-Tools solver", col: 5, kind: "tool" }
  edges:
    - ["buyers", "intake"]
    - ["pos", "signal"]
    - ["intake", "forecast", "normalized series"]
    - ["signal", "forecast", "features"]
    - ["forecast", "reconcile", "forecast + backtest"]
    - ["bias", "reconcile"]
    - ["reconcile", "constraint", "demand + band"]
    - ["reconcile", "planner", "figure + reason"]
    - ["planner", "bias", "overrides"]
    - ["constraint", "solver", "demand constraints"]
---

## Table of contents

## Where demand actually comes from

The apparel manufacturer my team works with supplies GAP and Levi's from plants in India, Bahrain, Jordan and Bangladesh. Demand for them is not a number. It is a set of signals that disagree with each other.

The buyers send forecast files. Each buyer has a different template, a different horizon and a different idea of what a week is. Point of sale data arrives from some buyers with a lag of days and from others not at all. Promotions are announced late, sometimes after the fabric has been cut. And the planners carry a layer of knowledge in their heads about which buyers over-forecast and by how much.

Before agents, a planner spent the first two days of each week turning those signals into one demand plan. The rest of the week went to reconciling that plan against capacity. I wrote about the capacity side earlier this month. This is the demand side.

## The design principle

Demand sensing agents do not forecast. Forecasting models forecast. The agents gather signals, run the models as tools, reconcile the outputs and produce constraints for the allocation solver.

That split matters. A language model is good at reading a buyer's spreadsheet with a new column and understanding what it means. It is bad at producing a numerically calibrated forecast. So the model does the reading and the reconciling, and Prophet and XGBoost do the numbers.

## The agent structure

```
demand_orchestrator
├── intake_agent
│     tools: parse_buyer_file, normalize_calendar, detect_template_drift
├── signal_agent
│     tools: fetch_pos(buyer, sku, weeks), fetch_promo_calendar, fetch_weather
├── forecast_agent
│     tools: run_prophet(series, horizon), run_xgb(features), backtest(series)
├── reconcile_agent
│     tools: buyer_bias_history, planner_overrides
└── constraint_agent
      tools: emit_demand_constraints -> OR-Tools model
```

Intake parses whatever the buyer sent. The template drift tool compares this week's file structure to last week's and flags changes. A renamed column used to cost a planner an hour. Now the agent asks one question and the planner confirms.

The signal agent fetches everything else that is dated. Point of sale where it exists. The promotion calendar, which is a shared sheet the buyers update irregularly. Weather for the destination markets, because outerwear demand moves with it.

The forecast agent runs the statistical models as tools. This is the part I brought forward from my time at Algo, where an ensemble of Prophet, LSTM and XGBoost with forty external features improved forecast accuracy by 18 percent. The features are different here. The pattern is the same. Every forecast run also runs a backtest, and the agent sees the backtest error alongside the forecast.

The reconcile agent is where the planner knowledge lives. It has a tool that returns each buyer's historical bias, computed from past forecasts against actuals. It has a tool that returns planner overrides from previous weeks with their stated reasons. It produces a reconciled demand figure per SKU per week, with a confidence band and a paragraph explaining how it got there.

## From demand to constraint

The constraint agent is small and strict. It takes the reconciled demand and emits constraints the solver understands.

```python
from ortools.sat.python import cp_model

def add_demand_constraints(model, x, demand, band, week, sku):
    # x[plant, sku, week] = units produced
    produced = sum(x[p, sku, week] for p in PLANTS)
    low = int(demand[sku, week] - band[sku, week])
    high = int(demand[sku, week] + band[sku, week])
    # must cover the low end of the band
    model.Add(produced >= low)
    # penalize overproduction beyond the high end
    over = model.NewIntVar(0, 10**7, f"over_{sku}_{week}")
    model.Add(over >= produced - high)
    return over  # summed into the objective with a cost weight
```

The confidence band is not decoration. A wide band means the solver has room and the plan will favor flexibility. A narrow band means the buyer's signal was consistent with point of sale and history, and the solver should commit. The reconcile agent's uncertainty becomes the solver's slack.

## What the planner sees

Not the constraints. The planner sees a page per buyer. This week's reconciled demand, the buyer's own forecast, point of sale where we have it, and the reconcile agent's paragraph. Where the agent adjusted a buyer's forecast by more than a threshold, the row is highlighted and the reason is one click away.

The planner can override any figure. The override is stored with a reason and becomes input to next week's reconcile agent. That loop is the whole point. The agent learns the planner's judgment, not by fine-tuning, but by reading last week's decisions as evidence.

## Where it is now

The demand agents have been in weekly use since the spring. Time from buyer files landing to a reconciled plan is now measured in hours rather than days. Planner overrides have dropped week over week as the bias tool has more history to work with. Forecast error on the buyers with good point of sale data is inside the band we set at the start. On the buyers without point of sale, the band is honestly wide, and the plan says so.

## Two things from this week

The MCP specification released yesterday made the stateless core the default and moved several features into extensions. Our tool servers for this client are all MCP. The stateless direction fits how we built them, because each tool call carries what it needs. The migration work is in the extensions we use for long-running forecast jobs, and that is on the list for August.

Anthropic released Claude Opus 5 last week. We tested it as the reconcile agent's model on a week of historical data. It wrote better explanations than the current model. The reconciled figures were not meaningfully different, which is what I expected, because the figures come from the forecast tools and the model only adjusts them within rules. Better explanations matter to planners, so we are moving that one agent. The rest stay on Gemini.

## The lesson

Demand is not a forecast. It is a negotiation between signals that arrive at different times with different reliability. The agents are good at the negotiation. The models are good at the numbers. Keeping those two jobs separate is what made the planners trust the plan.

---
title: "Data quality agents for a BigQuery warehouse"
description: "How my team built profiling, anomaly detection and natural language rule authoring for a retailer's warehouse, and why the alert routing was the hard part."
pubDatetime: 2026-05-13T15:00:00Z
kind: article
tags: ["agents", "gcp", "infra"]
sources: []
diagram:
  caption: "Three narrow agents profile, explain and author rules for a BigQuery warehouse, and a policy router decides who gets the alert."
  nodes:
    - { id: "load", label: "BigQuery load job", col: 0, kind: "source" }
    - { id: "profiler", label: "Profiler (no model)", col: 1, kind: "tool" }
    - { id: "ruleagent", label: "Rule authoring agent", col: 1, kind: "agent" }
    - { id: "metrics", label: "Metrics table", col: 2, kind: "store" }
    - { id: "analyst", label: "Analyst accepts rule", col: 2, kind: "human" }
    - { id: "detector", label: "Anomaly detector", col: 3, kind: "tool" }
    - { id: "dataplex", label: "Dataplex lineage, owners", col: 3, kind: "store" }
    - { id: "explainer", label: "Gemini explainer (ADK)", col: 4, kind: "agent" }
    - { id: "router", label: "Alert router policy", col: 4, kind: "tool" }
    - { id: "delivery", label: "PagerDuty, Slack, digest", col: 5, kind: "output" }
  edges:
    - ["load", "profiler"]
    - ["profiler", "metrics", "stats per column"]
    - ["metrics", "detector", "seasonal baseline"]
    - ["ruleagent", "analyst", "SQL + dry run"]
    - ["analyst", "detector", "committed rules"]
    - ["detector", "explainer", "flagged metric"]
    - ["dataplex", "explainer"]
    - ["detector", "router", "severity"]
    - ["explainer", "router", "explanation"]
    - ["dataplex", "router", "owner tags"]
    - ["router", "delivery"]
---

## Table of contents

## Monday morning, wrong numbers

A retail client runs a BigQuery warehouse that feeds their Monday trading report. In February the report showed a 30 percent drop in one region. Nobody had lost 30 percent of their sales. A store hierarchy table had been reloaded with a truncated file on Sunday night, and every downstream join silently dropped rows.

The data team found it by Tuesday. The commercial team had already spent Monday in meetings about it. The client asked us for an agent that would catch this kind of failure before the report went out.

## What we did not build

We did not build an agent that "understands the data". We built three narrow agents with clear jobs and one router that decides who gets told. Each piece is boring on its own. That is the point.

The stack was mostly what the client already had. BigQuery, Dataplex for metadata and lineage, Cloud Composer for scheduling, Pub/Sub for events, and Gemini through ADK for the two agents that need a model. Slack and PagerDuty for delivery.

## Agent one: the profiler

The profiler runs after every load job. It does not use a model. It computes a fixed set of statistics per table and per column and writes them to a metrics table.

```sql
-- generated per table from INFORMATION_SCHEMA, one row per column per load
SELECT
  '{{ table }}' AS table_name,
  '{{ column }}' AS column_name,
  @load_id AS load_id,
  COUNT(*) AS row_count,
  COUNTIF({{ column }} IS NULL) AS null_count,
  APPROX_COUNT_DISTINCT({{ column }}) AS distinct_count,
  MIN({{ column }}) AS min_value,
  MAX({{ column }}) AS max_value
FROM `{{ dataset }}.{{ table }}`
```

Row counts, null rates, distinct counts, min and max, and for numeric columns a few quantiles. The truncated store hierarchy file would have shown up here as a row count at 40 percent of the previous load. Nothing clever. The client had never computed it.

## Agent two: the anomaly detector

The detector reads the metrics table and decides what is unusual. For most columns a seasonal baseline is enough. Row counts on a sales table have a weekly pattern. Null rates on a customer email column should be flat. We fit a simple model per metric, a rolling median with a wide spread, and flag values outside the band.

The model call comes in for context, not detection. When a metric is flagged, a Gemini agent reads the lineage from Dataplex and the recent load job history and writes a two-paragraph explanation. Which upstream table changed. Which downstream tables and reports will be affected. What the last known good load was.

```python
explainer = Agent(
    name="dq_explainer",
    model="gemini-2.5-flash",
    instruction=EXPLAINER_INSTRUCTION,
    tools=[get_lineage, get_load_history, get_metric_series, get_owners],
)
```

The instruction tells it to state facts from the tools and to say "unknown" when a tool returns nothing. It does not guess causes. We tested that with a set of forty historical incidents the client had written up. The explainer named the correct upstream table in 34 of them and said unknown in 5. It named the wrong table once, and that case became an eval fixture.

## Agent three: rule authoring in plain language

Statistical baselines catch drift. They do not encode business rules. A returns table should never have a return date before the sale date. A store code must exist in the hierarchy. Analysts know hundreds of these. They were not going to write SQL assertions for each one.

So the third agent takes a sentence and produces a rule.

```text
Analyst: "Every row in fact_returns must have a sale_date on or before return_date,
          and the store_id must exist in dim_store for the same load."
```

```sql
-- generated, reviewed, then committed to the rules repo
SELECT COUNT(*) AS violations
FROM `retail.fact_returns` r
LEFT JOIN `retail.dim_store` s
  ON r.store_id = s.store_id AND s.load_id = r.load_id
WHERE r.sale_date > r.return_date OR s.store_id IS NULL
```

The agent uses schema introspection before it writes anything, the same pattern I built for Adspirer two years ago. It knows the column names and types. It proposes the SQL, shows the analyst a dry-run count against yesterday's data, and only then offers to commit the rule. A person clicks accept. The rule lands in a Git repository and Composer picks it up on the next run.

In the first month the analysts wrote 140 rules this way. A handful needed hand edits. Most were correct on the first try because the questions were simple and the schema was in the prompt.

## The hard part was routing

Everything above took about five weeks. The alert routing took three more, and it was the part the client cared about most.

A data quality alert is only useful if the right person sees it at the right time with the right urgency. Too many alerts and people mute the channel. Too few and Monday happens again.

The router is a small policy engine, not a model. It uses the Dataplex owner tags, the severity from the detector, the time of day, and which reports depend on the affected table.

```yaml
routes:
  - match: { severity: high, downstream_reports: [monday_trading] }
    when: { day: [sat, sun], before: "06:00 Europe/London" }
    to: pagerduty:data-oncall
  - match: { severity: high }
    to: slack:#data-quality, email:owner
  - match: { severity: medium }
    to: slack:#data-quality
  - match: { severity: low }
    to: digest:daily
```

The first rule is the one that would have saved that Monday. A high severity anomaly on any table feeding the Monday report, detected over the weekend, pages the on-call engineer. Everything else waits for people to be awake.

We also added a rule I did not expect to need. If the same anomaly fires on three consecutive loads and nobody has acknowledged it, the router escalates to the owner's manager. Alerts that nobody owns are worse than no alerts.

## What the numbers look like

After three months in production the client shared their view. Data incidents that reached a business report fell from roughly four a month to one. Median time from bad load to first alert dropped from the next business day to under twenty minutes. The daily digest gets read. The high severity channel gets about two messages a week, and people respond to them.

The analysts' favorite part is the rule authoring. My favorite part is that the profiler, the piece with no model in it, catches most of the problems.

## Lessons

Use a model where language is the input or the output. Rule authoring and incident explanation are language. Detection is arithmetic.

Put owners in the metadata layer, not in the agent. Dataplex tags gave us routing for free once the client filled them in. Filling them in took a workshop.

Treat every wrong explanation as an eval case. The detector's forty historical incidents became the regression suite. Every prompt change runs against it.

Route by consequence, not by table. The question is never "is this table important". It is "which report breaks, and who is reading it, and when".

The client's Monday report has been right every Monday since March. That is the metric.

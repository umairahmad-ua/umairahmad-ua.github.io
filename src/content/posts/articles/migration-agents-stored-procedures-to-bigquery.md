---
title: "Migration agents: translating a decade of stored procedures to BigQuery"
description: "How we used a translation agent, a validation agent and a human gate to move thousands of legacy SQL objects onto BigQuery without breaking finance close."
pubDatetime: 2026-01-25T15:00:00Z
kind: article
featured: true
tags: ["agents", "gcp", "infra"]
sources:
  - title: "Google Cloud: Gemini Enterprise launch"
    url: "https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise"
    date: 2025-10-09
  - title: "Google: Gemini 3 collection"
    url: "https://blog.google/products-and-platforms/products/gemini/gemini-3-collection/"
    date: 2025-11-18
  - title: "Google: Gemini 3 Flash"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2025-12-17
diagram:
  caption: "Three narrow agents translate, reconcile and document each object, and finance approves every cutover."
  nodes:
    - { id: "legacy", label: "SQL Server procedures", col: 0, kind: "source" }
    - { id: "schema", label: "Schemas and style guide", col: 0, kind: "store" }
    - { id: "translate", label: "Translation agent", col: 1, kind: "agent" }
    - { id: "validate", label: "Validation agent", col: 2, kind: "agent" }
    - { id: "bq", label: "BigQuery shadow dataset", col: 3, kind: "store" }
    - { id: "docs", label: "Documentation agent", col: 3, kind: "agent" }
    - { id: "recon", label: "Reconciliation report", col: 4, kind: "output" }
    - { id: "rollback", label: "Rollback plan", col: 4, kind: "output" }
    - { id: "finance", label: "Finance approves cutover", col: 5, kind: "human" }
  edges:
    - ["legacy", "translate", "Gemini 3 Pro"]
    - ["schema", "translate"]
    - ["translate", "validate", "SQL plus assumptions"]
    - ["validate", "bq", "dual run, two closes"]
    - ["bq", "recon", "nightly deltas"]
    - ["validate", "docs"]
    - ["docs", "recon", "lineage entry"]
    - ["docs", "rollback"]
    - ["recon", "finance"]
    - ["rollback", "finance"]
---

The client's finance close runs on the last three working days of every month. It has run on the same SQL Server estate for over a decade. Thousands of stored procedures, SSIS packages and reporting views feed it. Nobody on the current team wrote most of them. Some of the authors have retired. The mandate we received in the autumn was simple to say and hard to do. Move all of it onto BigQuery, and do not miss a close.

This is the kind of project where an LLM looks like a miracle on day one and a liability on day thirty. I want to write down how we structured the work so the miracle part stayed and the liability part did not.

## Table of contents

## The shape of the problem

A migration like this has three kinds of objects. Stored procedures that transform data. Scheduled jobs that decide when things run and in what order. Reports and views that the business reads. Each kind fails differently when translated badly.

A bad procedure translation gives you wrong numbers. A bad job translation gives you right numbers on the wrong day. A bad view translation gives you a dashboard that loads but shows a column with a different meaning. The last one is the most dangerous because it looks fine.

So the design goal was never "translate SQL". The design goal was "prove that each translated object produces the same answer as the source, and keep proving it until the business signs off".

## Three agents and one human

We built the pipeline around three narrow agents and a human approval step. Each agent has one job, one set of tools and one output format. None of them can write to the target project on its own.

The translation agent takes a legacy object and its dependencies and produces BigQuery SQL. It runs on Gemini 3 Pro, which Google released in November. It sees the source text, the schema of every table it touches, and a style guide we wrote for the target. It returns the translation plus a list of assumptions it made. The assumptions list turned out to be the most valuable part of its output.

The validation agent takes the source object and the translated object and writes reconciliation queries. Row counts, sums of every numeric column, distinct counts of every key, and min and max of every date. It runs those against both systems for a fixed sample of business dates and reports the deltas. It does not decide if a delta is acceptable. It reports.

The documentation agent reads the source, the translation and the validation report and writes a lineage entry. Which tables feed this object, which objects read from it, what changed in the translation and why. This is the file the finance team reads. It is also the file a future engineer reads when something breaks at two in the morning.

Then a person looks at all three outputs and approves or rejects the cutover batch. Nothing goes live without that click.

## What a translation looks like

Here is a small procedure of the kind we saw hundreds of times. It computes month-to-date revenue by region and writes it to a summary table.

```sql title="legacy_mtd_revenue.sql"
CREATE PROCEDURE dbo.usp_mtd_revenue @as_of DATE
AS
BEGIN
  DELETE FROM dbo.mtd_revenue WHERE as_of = @as_of;

  INSERT INTO dbo.mtd_revenue (as_of, region, revenue)
  SELECT @as_of,
         r.region_name,
         SUM(ISNULL(o.net_amount, 0))
  FROM dbo.orders o
  JOIN dbo.regions r ON r.region_id = o.region_id
  WHERE o.order_date >= DATEADD(DAY, 1, EOMONTH(@as_of, -1))
    AND o.order_date <= @as_of
    AND o.status <> 'CANCELLED'
  GROUP BY r.region_name;
END
```

The translation agent produced this.

```sql title="mtd_revenue.sql"
CREATE OR REPLACE PROCEDURE finance.mtd_revenue(as_of DATE)
BEGIN
  DELETE FROM finance.mtd_revenue WHERE as_of = as_of_param;

  INSERT INTO finance.mtd_revenue (as_of, region, revenue)
  SELECT as_of,
         r.region_name,
         SUM(IFNULL(o.net_amount, 0))
  FROM finance.orders AS o
  JOIN finance.regions AS r ON r.region_id = o.region_id
  WHERE o.order_date BETWEEN DATE_TRUNC(as_of, MONTH) AND as_of
    AND o.status != 'CANCELLED'
  GROUP BY r.region_name;
END;
```

Two things to notice. The first version of this translation had a bug the agent introduced itself. The parameter name shadowed the column name in the DELETE, so the delete matched every row. The validation agent caught it because the row count in the target table dropped to one region's worth after a second run. We fixed the prompt to always suffix parameters. The bug never came back.

The second thing is the assumptions list that came with it. The agent flagged that `ISNULL` and `IFNULL` behave the same for this case, that `EOMONTH(@as_of, -1) + 1 day` equals `DATE_TRUNC(as_of, MONTH)`, and that string comparison in the source was case-insensitive while BigQuery's is not. That last one mattered. Some rows had `Cancelled` in mixed case. The source excluded them. The naive translation did not.

## What a reconciliation looks like

The validation agent writes queries like this one for every numeric column and every business date in the sample.

```sql title="reconcile_mtd_revenue.sql"
WITH src AS (
  SELECT region, revenue
  FROM EXTERNAL_QUERY('projects/x/locations/us/connections/legacy',
    'SELECT region, revenue FROM dbo.mtd_revenue WHERE as_of = ''2025-11-28''')
),
tgt AS (
  SELECT region, revenue
  FROM finance.mtd_revenue
  WHERE as_of = DATE '2025-11-28'
)
SELECT
  COALESCE(s.region, t.region) AS region,
  s.revenue AS src_revenue,
  t.revenue AS tgt_revenue,
  ROUND(IFNULL(t.revenue, 0) - IFNULL(s.revenue, 0), 2) AS delta
FROM src s
FULL OUTER JOIN tgt t USING (region)
WHERE ABS(IFNULL(t.revenue, 0) - IFNULL(s.revenue, 0)) > 0.01
ORDER BY ABS(delta) DESC;
```

An empty result is a pass. A non-empty result goes into the report with the rows attached. Humans decide what a tolerable delta is. In finance it is usually zero.

## Dual run is not optional

For every object in a cutover batch, both systems ran in parallel for at least two full closes. The target wrote to a shadow dataset. The reconciliation queries ran every night. The finance team saw a report every morning with three numbers per object. Rows compared, rows matching, rows differing.

This is the expensive part. It is also the only part that made the business sign off. The agents produced translations in minutes. The trust took weeks, and no model shortens that. I have stopped trying to sell speed on the translation step. I sell the reconciliation report instead.

## Rollback is a first-class output

Every cutover batch produced a rollback plan as part of the documentation. Which downstream jobs to repoint, which tables to restore, which dashboards to flip. We tested one rollback for real in December when a currency conversion job started reading a table one day early because of a timezone default. We were back on the legacy path in under an hour. The plan was written by the documentation agent and reviewed by a person. Neither alone would have been enough.

## What the agents got wrong

The translation agent overreached. Given a procedure with a cursor loop, it sometimes rewrote the logic into a set-based query. The set-based version was usually better. It was also different, and different needs proof. We changed the instruction to translate faithfully first and suggest improvements in a separate section.

The validation agent under-sampled at first. It picked business dates uniformly. Month-end dates carry the edge cases, so we forced every sample to include the last three days of each month plus the first day of the next.

The documentation agent wrote too much. Finance people do not want a paragraph on why `DATE_TRUNC` was chosen. They want the table of inputs and outputs. We cut its output to a fixed template.

## The thesis

Here is what I now believe about migration work with agents. The agent is cheap. The trust is expensive. A model can translate a thousand procedures over a weekend. It cannot make a controller sign a document saying the numbers are right. Only evidence does that. Reconciliation reports, dual-run periods and tested rollbacks are the product. The translation is an input to the product.

If you are scoping a migration like this, budget the agent work at a fifth of the timeline. Budget the proving at the rest. Then tell the client that number before they hear the demo, because the demo will make them believe the opposite.

## What is next

The client's estate is about a third moved as I write this. The pipeline has settled into a rhythm of one batch per week. The next thing I want to try is letting the validation agent propose the sample dates itself, based on where it has found deltas before. That is a small change with a real payoff. It is also the kind of change I would only make now that the humans in the loop trust the reports they are reading.

---
title: "Migration agents: translating a decade of stored procedures to BigQuery"
description: "How we used a translation agent, a validation agent and a human gate to move thousands of legacy SQL objects onto BigQuery without breaking finance close."
pubDatetime: 2026-01-25T15:00:00Z
kind: article
theme: industry
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


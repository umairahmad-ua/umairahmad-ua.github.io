---
title: "Reconciliation agents: proving two databases agree"
description: "The validation half of our migration program. How a reconciliation agent compares a legacy warehouse to BigQuery, what tolerances mean in practice, and the report a CFO will sign."
pubDatetime: 2026-01-07T15:00:00Z
kind: article
theme: industry
tags: ["agents", "gcp", "infra"]
sources: []
---

## Table of contents

## Nobody signs off on a translation

In a migration, translating the code is the part people talk about. A model converts a stored procedure to BigQuery SQL. It looks right. It runs. Everybody is pleased.

Then finance asks the only question that matters. Does the new number match the old number. If the answer is "probably," the cutover does not happen.

My team is moving a client's data platform off a legacy warehouse onto BigQuery. Thousands of stored procedures, ETL jobs and reports. The translation agent gets most of the attention. The reconciliation agent gets the signature. This is how it works.

## What reconciliation means here

Two systems run side by side. The legacy warehouse produces its tables the way it always has. BigQuery produces the same tables from translated code. The reconciliation agent's job is to prove, table by table and column by column, that the two agree closely enough for the business to switch.

"Closely enough" is the hard part. A finance close table must match to the cent. A daily marketing rollup can tolerate rounding drift. A table of free-text customer notes only needs the same row count and the same keys. Every table has a tolerance rule, and the rules are written by the business, not by us.

## The three checks

The agent runs three layers, cheapest first.

**Counts and keys.** Row count per table, per partition. Distinct count on every primary key. Null count on every column. If counts disagree, the deeper checks do not run. There is no point comparing sums on tables with different rows.

**Aggregates.** For every numeric column, sum, min, max and a checksum of the sorted values. For every date column, min and max. For every string column, a count of distinct values and a hash of the sorted distinct set. These run as one query per table on each side.

**Sampled row diffs.** Ten thousand rows sampled by key, pulled from both systems, compared field by field. This catches the errors aggregates hide. A column where one row is off by plus a hundred and another by minus a hundred passes the sum check and fails the row check.

A simplified version of the aggregate check, in the form the agent generates:

```sql
-- BigQuery side, generated per table from the schema
SELECT
  COUNT(*)                          AS row_count,
  COUNT(DISTINCT invoice_id)        AS key_count,
  SUM(amount)                       AS sum_amount,
  MIN(amount)                       AS min_amount,
  MAX(amount)                       AS max_amount,
  FARM_FINGERPRINT(STRING_AGG(CAST(amount AS STRING) ORDER BY invoice_id)) AS fp_amount,
  COUNTIF(customer_ref IS NULL)     AS null_customer_ref
FROM finance.invoices
WHERE posting_date BETWEEN @start AND @end;
```

The legacy side gets the same query in its own dialect. The translation agent writes both. The reconciliation agent runs them and compares.


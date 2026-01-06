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


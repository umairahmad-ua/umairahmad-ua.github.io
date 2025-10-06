---
title: "Text-to-SQL over BigQuery that finance will trust"
description: "A finance team asked for questions in English and answers from the warehouse. Here is the semantic layer, validation loop, and judge that made the numbers trustworthy."
pubDatetime: 2025-10-08T15:00:00Z
kind: article
theme: industry
tags: ["agents", "gcp", "evals"]
sources: []
---

## Table of contents

## The demo everyone has seen

Text-to-SQL is the oldest agent demo. Type a question, get a query, get a table. Every vendor shows it. Almost nobody runs it in front of a finance team, because a finance team will check the number against last month's report, and the first time it disagrees, the tool is dead.

A financial services client asked my team for exactly this over their BigQuery warehouse. Revenue by product line, churn by cohort, cost allocation by department. The users were analysts who knew SQL and controllers who did not. Both needed the same answer to the same question.

This is what it took to get the controllers to stop checking.

## The semantic layer is the product

The model does not see raw tables. It sees a semantic layer we built with the client's finance team over three weeks. Every metric has one definition. Revenue is recognized revenue, net of refunds, in the reporting currency, by the invoice date. That sentence took a two-hour meeting. There were forty such sentences.

The layer is a set of BigQuery views plus a YAML catalog:

```yaml
metric: net_revenue
view: fin.v_net_revenue
grain: [month, product_line, region]
definition: >
  Recognized revenue net of refunds and credits, converted to USD
  at the month-end rate, attributed by invoice date.
synonyms: [revenue, net sales, top line]
owner: fp&a
```

The agent generates SQL against the views, never the source tables. If a question needs a metric that does not exist in the catalog, the agent says so and offers the closest one. That refusal is a feature. It is also where new metrics get requested.


---
title: "Text-to-SQL over BigQuery that finance will trust"
description: "A finance team asked for questions in English and answers from the warehouse. Here is the semantic layer, validation loop, and judge that made the numbers trustworthy."
pubDatetime: 2025-10-08T15:00:00Z
kind: article
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

## Schema retrieval, not schema dumping

The warehouse has several hundred tables. Putting the schema in the prompt is a common mistake. We index the catalog entries, the view schemas, and a curated set of example questions with their known-good SQL in Vertex AI Search. For each question the agent retrieves the five most relevant metrics and views, plus three similar solved examples. The prompt stays small and the examples do most of the work.

## Generate, validate, run

The pipeline uses Google ADK with three agents under an orchestrator.

**Planner.** Reads the question, retrieves catalog entries, writes a short plan in plain English: which metric, which grain, which filters, which time range. The plan is shown to the user before any SQL runs. A controller who cannot read SQL can read "net revenue by product line for Q3 2025, EMEA only".

**Writer.** Turns the plan into SQL against the semantic views. Outputs a Pydantic model with the SQL, the metrics used, and the assumptions made.

**Validator.** Does four things before anything executes:

1. Dry run against BigQuery to catch syntax and permission errors and to get the bytes scanned.
2. Static checks: only semantic views are referenced, no `SELECT *`, a time filter exists, the result is bounded.
3. A cost gate. Queries over a threshold need a confirmation click.
4. A judge model, different from the writer, that compares the SQL to the plan and to the catalog definition and returns agree or disagree with a reason.

If the judge disagrees, the writer gets one retry with the reason. If it disagrees again the user sees both the plan and the SQL and a message that says the tool is not confident. That message is rare and it is honest.

```python
class SqlCandidate(BaseModel):
    sql: str
    metrics: list[str]
    grain: list[str]
    time_range: TimeRange
    assumptions: list[str]

def validate(c: SqlCandidate, plan: Plan) -> Verdict:
    dry = bq.query(c.sql, dry_run=True)
    if dry.errors: return Verdict.fail(dry.errors)
    if not only_semantic_views(c.sql): return Verdict.fail("raw table reference")
    if dry.total_bytes_processed > COST_GATE: return Verdict.confirm(dry.total_bytes_processed)
    return judge.compare(plan, c)
```

## Row-level security stays in BigQuery

The agent runs queries as the user, not as a service account. BigQuery row-level security policies decide what each user can see. A regional controller asking for global revenue gets their region. The agent does not know about the policy and does not need to. That decision removed an entire class of prompt injection risk. There is no way to talk the model into showing data the user cannot query.

## The eval set came from the finance team

We asked the FP&A team for the fifty questions they answer most often, with the SQL they use and last quarter's results. That became the regression suite. Every change to the catalog, the prompts, or the model runs those fifty questions and compares result tables, not just SQL text. Two queries can differ in text and agree in result. That is a pass.

At launch the suite passed 46 of 50. The four failures were all metric definition disagreements inside the finance team, not model errors. The tool surfaced that the team had two definitions of gross margin. They picked one. That was worth the project by itself.

## Ambiguity is answered with a question

"Revenue last quarter" has three readings in this company. Calendar quarter, fiscal quarter, and the trailing ninety days a sales leader means when they say quarter. The planner does not guess. When a term maps to more than one catalog entry with the same synonym, the agent asks. "Do you mean fiscal Q3, which ended September 27, or calendar Q3?" One click. The choice is stored in session state so the next question in the conversation uses the same reading.

This felt slow in the first demo. In practice it prevents the worst failure, a confident answer to a different question than the one asked. The finance team told us they have the same clarification conversation with new analysts. The agent is doing what a careful analyst does.

## Watching it in production

Every query, plan, judge verdict, and result hash is logged to BigQuery. A Looker dashboard for the FP&A lead shows daily question volume, judge rejection rate, cost gate hits, and escalations. When the rejection rate jumped one Tuesday, the log showed a new view had been deployed with a renamed column. The catalog was fixed within the hour. Without the log it would have surfaced as wrong numbers in a Friday report.

## Handoff to Looker

Analysts wanted to keep working after the answer. Every result has an "open in Looker" action that builds an explore with the same metric, grain, and filters. The agent gets the question answered. Looker gets the follow-up analysis. We did not try to make the agent do charts.

## Numbers after a quarter

About 60 percent of the finance team's routine questions now go through the agent. The judge rejects roughly one in twenty first drafts. Users escalate to a human analyst on about 5 percent of questions, mostly for metrics not in the catalog. The catalog has grown from forty metrics to sixty-eight, each one a definition the finance team agreed on.

## The lesson

Text-to-SQL is not a model problem. It is a definitions problem. Get finance to write down what revenue means, put that in front of the model, refuse questions outside it, and validate with a second model before running. The controllers stopped checking the numbers in week six. That is the only metric that mattered.

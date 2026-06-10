---
title: "Data quality agents for a retail data platform"
summary: "Agents that profile new tables, propose checks, explain failures in plain language and open the fix as a pull request for a data engineer to approve."
role: "Architect, team of 3"
org: "Zazmic, retail data platform"
period: "Feb 2026 to Jul 2026"
stack: ["Gemini 3 Flash", "Google ADK", "BigQuery", "Dataflow", "Airflow", "Cloud Composer", "Claude Code", "MCP", "Pub/Sub", "Looker", "Langfuse", "Terraform"]
order: 20
---

A profiling agent watches new tables land and proposes freshness, volume and distribution checks. When a check fails, an explainer agent writes what changed and where it probably came from. A fix agent drafts the pull request. Engineers merge or reject. Mean time to notice a broken feed went from days to under an hour.

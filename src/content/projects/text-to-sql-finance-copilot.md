---
title: "Text-to-SQL finance copilot on BigQuery"
summary: "Finance analysts ask questions in plain language and get SQL, results and a chart. The agent works only from a governed semantic layer, so two people asking the same question get the same number."
role: "Architect, team of 3"
org: "Zazmic, manufacturing group finance team"
period: "Oct 2025 to Feb 2026"
stack: ["Gemini 2.5 Pro", "Google ADK", "BigQuery", "Looker", "Vertex AI Agent Engine", "Cloud Run", "Redis", "Pydantic", "Langfuse", "Airflow", "MCP"]
order: 17
---

The hard part was not SQL generation. It was agreeing on what revenue means. We built a semantic layer first, then let the agent query only through it. Every answer shows the SQL it ran. Analysts fixed the semantic layer more often than they fixed the agent.

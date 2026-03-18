---
title: "Fraud triage agent for a payments company"
summary: "Sits on top of the fraud model and writes the case file an analyst would have assembled by hand: linked accounts, device history, merchant patterns and a recommended action with reasons."
role: "Lead, team of 3"
org: "Developers Inc, payments processor"
period: "Aug 2024 to May 2025"
stack: ["Claude", "LangGraph", "Pydantic", "Kafka", "Redis", "Elasticsearch", "AWS SageMaker", "AWS Lambda", "DynamoDB", "Step Functions", "Langfuse"]
order: 14
---

The scoring model flags a transaction. The agent then pulls what the analyst would pull, from account graph to velocity checks, and writes a structured case with a recommended action. Analysts accept, edit or reject. Median time to a decision dropped by about a third. The agent never blocks a payment on its own.

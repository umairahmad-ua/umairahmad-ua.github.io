---
title: "RFP go/no-go assistant"
summary: "Reads incoming RFPs, scores them against our capabilities and past delivery, drafts the proposal skeleton and flags the sections that need a human before the deadline."
role: "Lead, team of 2"
org: "Zazmic, internal"
period: "Aug 2025 to Nov 2025"
stack: ["Claude Agent SDK", "Claude Code", "MCP", "Vertex AI Search", "BigQuery", "Cloud Run", "Firestore", "Pydantic", "Langfuse"]
order: 22
---

I built the first version of this on GPT-4 and LangChain two years earlier. The rebuild uses the Claude Agent SDK with MCP tools into our project history and staffing data. The scoring agent says no more often than people do, and it explains why. That is the point. Proposal drafting starts from a skeleton that already knows what we have delivered before.

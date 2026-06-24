---
title: "Campaign generation with brand guardrails for Let's Forage"
summary: "Extends Scout into production-ready social campaigns: concepts, copy variants and briefs that pass a brand policy check before anyone sees them, wired into Meta's ads ecosystem."
role: "Architect and lead, team of 4"
org: "Zazmic, for Let's Forage"
period: "Nov 2025 to present"
stack: ["Google ADK", "Gemini 3 Pro", "Vertex AI Agent Engine", "Vertex AI Search", "Prompt Management", "Pydantic", "Cloud Run", "BigQuery", "MCP", "Langfuse", "RAGAS"]
url: "https://www.letsforage.com/"
order: 21
featured: true
---

Campaign author agents generate concepts and copy. A guardrail agent checks every output against the brand's own rules, from banned claims to tone, and rejects with a reason. Rejected drafts go back for another pass, not to a human. Marketers review what survives. Brand teams including Apple and Meta use the output as a starting point, not a finished ad.

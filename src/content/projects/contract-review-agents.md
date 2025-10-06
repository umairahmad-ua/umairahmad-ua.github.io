---
title: "Contract review agents for an insurer's legal team"
summary: "Clause extraction, obligation mapping and deviation checks against the standard playbook, with every finding linked to the exact contract text and a lawyer approving before anything leaves the system."
role: "Lead, team of 3"
org: "Developers Inc, commercial insurer"
period: "Feb 2024 to Dec 2024"
stack: ["GPT-4", "LangChain", "spaCy", "Elasticsearch", "PostgreSQL", "FastAPI", "Pydantic", "Docker", "AWS Lambda", "RAGAS"]
order: 16
---

An extraction agent pulls clauses and obligations. A comparison agent checks each one against the firm's playbook and marks deviations. A summary agent writes the executive brief. Lawyers review about 5,000 contracts a month through it. The rule from day one: no finding without a citation into the source text.

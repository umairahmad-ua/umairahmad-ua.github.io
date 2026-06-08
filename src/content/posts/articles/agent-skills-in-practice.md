---
title: "Agent Skills in practice: packaging expertise for reuse"
description: "Agent Skills became an open standard in December. Six months on, how my team packages domain procedures as skills, versions them, tests them and shares them across clients."
pubDatetime: 2026-06-10T15:00:00Z
kind: article
theme: platform
tags: ["claude", "agents", "evals"]
sources:
  - title: "Anthropic makes Agent Skills an open standard"
    url: "https://siliconangle.com/2025/12/18/anthropic-makes-agent-skills-open-standard/"
    date: 2025-12-18
  - title: "Anthropic releases Claude Fable 5 and Claude Mythos 5"
    url: "https://www.anthropic.com/news/claude-fable-5-mythos-5"
    date: 2026-06-09
---

## Table of contents

## The same procedure, written four times

Last autumn I found the same incident triage procedure written into four different agents across two clients. Each copy had drifted. One checked the on-call schedule. One did not. One had a step about redacting customer identifiers that the others lacked. All four had been written by good engineers who did not know the others existed.

Anthropic released [Agent Skills as an open standard](https://siliconangle.com/2025/12/18/anthropic-makes-agent-skills-open-standard/) in December. The idea is plain. A skill is a folder with a `SKILL.md` that tells an agent when to use it and how, plus any scripts or references the procedure needs. The agent loads the skill when the task matches. The procedure lives once.

My team has spent six months building on that. This is what a skill looks like for us now, and what we learned.

## Anatomy of one of ours

Our cloud operations agent runs on the Claude Agent SDK. It has eleven skills. Here is the one that replaced those four triage procedures.

```text
skills/incident-triage/
  SKILL.md
  scripts/
    fetch_alert_context.py
    redact.py
  references/
    severity-matrix.md
    escalation-paths.md
  tests/
    cases.yaml
```

The `SKILL.md` front matter says when to load it. The body says what to do, in order, with the gates.

```markdown
---
name: incident-triage
description: Triage a cloud alert into severity, owner and first action. Use when
  an alert arrives from Cloud Monitoring, PagerDuty or a human pasting an alert.
version: 2.3.0
requires_tools: [get_alert, get_logs, get_metrics, get_oncall, post_slack]
---

1. Run scripts/fetch_alert_context.py with the alert id. Do not query logs directly.
2. Run scripts/redact.py on the context before reasoning about it.
3. Classify severity using references/severity-matrix.md. Quote the matching row.
4. Identify the owner from get_oncall for the affected service.
5. Propose one first action from references/escalation-paths.md.
6. Stop. Post the triage to Slack and wait. Never execute the action in this skill.
```

Step six is the whole reason the skill exists. Triage is read-only. Remediation is a different skill with a different permission scope and a human approval in front of it. Splitting them into two skills made the boundary a file boundary, which is far easier to review than a paragraph in the middle of one long prompt.


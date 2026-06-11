---
title: "Agent Skills in practice: packaging expertise for reuse"
description: "Agent Skills became an open standard in December. Six months on, how my team packages domain procedures as skills, versions them, tests them and shares them across clients."
pubDatetime: 2026-06-10T15:00:00Z
kind: article
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

## Skills are configuration, so they get versions

Every skill has a semantic version. The agent's manifest pins versions per client.

```yaml
# clients/insurer-ops/agent.yaml
skills:
  incident-triage: 2.3.0
  remediation-approved-playbooks: 1.8.2
  cost-anomaly-review: 1.1.0
  change-freeze-check: 1.0.4
```

A skill change is a pull request in the skills repository. The PR bumps the version, the tests run, and a client picks up the new version when they choose. When the insurer client asked for a stricter redaction rule in March, we released `incident-triage` 2.2.0 with the change. The media client stayed on 2.1.x for two weeks until their compliance team read the diff. Both were happy. Neither could have been happy with one shared prompt.

## Testing a skill

The `tests/cases.yaml` file is the part nobody expects and the part I insist on. A skill without cases is a suggestion.

```yaml
- name: p1-database-saturation
  input:
    alert_id: "alert-2026-03-14-0091"
  expect:
    severity: P1
    owner_team: data-platform
    first_action_matches: "scale read replicas|failover"
    no_execution: true
    redacted_fields: [customer_id, email]

- name: informational-deploy-notice
  input:
    alert_id: "alert-2026-03-15-0002"
  expect:
    severity: P4
    no_slack_post: true
```

The runner loads the skill into a test agent with recorded tool responses and checks the expectations. Twenty to forty cases per skill. The suite runs on every PR to the skills repo and, importantly, on every model change. When we moved the ops agent to Claude Opus 4.7 in April, three skills had cases fail. Two were phrasing. One was a real change in how the model followed a numbered list when a tool returned an error mid-way. We fixed the skill text, not the model.

## Skills across frameworks

The standard is Anthropic's. Our Scout agents run on Google ADK with Gemini. We wanted the same procedures there, especially the redaction and grounding steps.

The `SKILL.md` format is markdown with front matter, so loading it into an ADK agent's instruction is a few lines. Scripts run as tools in either framework. What does not transfer is the automatic "load when relevant" behavior, which is an Agent SDK feature. In ADK we load skills explicitly per agent in config. That is fine. It is arguably clearer.

The point is that the procedure is written once, reviewed once, tested once, and both stacks read it. When the Fable 5 and Mythos 5 models [arrived yesterday](https://www.anthropic.com/news/claude-fable-5-mythos-5), we did not have to think about whether our procedures would survive the model change. We ran the skill suites. They tell us.

## What goes in a skill and what does not

Six months of writing these produced a short rule.

A skill contains a procedure a human expert would write down for a new colleague. Steps, gates, references, the scripts that fetch or transform data. Things that are true regardless of which client or model runs them.

A skill does not contain client facts, credentials, tool implementations or anything that changes per deployment. Those live in the client manifest and the tool layer. The moment client data leaked into a skill, we lost the ability to share it, and sharing is the reason for the format.

We also learned to keep skills short. Our longest is 140 lines. When a skill grows past that it is two skills, and usually the second one needs a different permission scope anyway.

## A skill that went wrong

The redaction skill is the one I trust most now. It is also the one that failed first.

Version two added a rule for national ID numbers from a new client's country. The rule was a regular expression written from a spec. The tests passed. Two weeks later a reviewer noticed that invoice numbers from that client were being redacted too. Same digit count, similar formatting, nothing in the test suite that looked like an invoice.

The skill did exactly what its file said. The file was wrong about the world.

Three changes came out of that. First, every redaction rule now carries a negative example set. For each pattern we keep a list of strings that look similar and must not be redacted. Invoice numbers, purchase order numbers, tracking numbers, internal ticket IDs. The test runner checks both lists on every change.

Second, a skill change that touches a redaction rule cannot merge without a sample run over one hundred recent documents from the client, with the diff of what changed in the redacted output shown in the pull request. A reviewer looks at the diff, not the regex.

Third, the skill file now has a section called known limits. It says in plain words what the rule cannot tell apart and what a human should watch for. When the compliance officer reads the skill, that section is the one they read twice.

None of this is specific to skills. It is ordinary engineering discipline applied to a text file that used to live inside a prompt. That is the argument for the format. The failure was visible, attributable to one file and one version, and fixable in one place.

## Library so far

Across three clients we now have 31 skills. Nine are shared across all three. The shared ones are the ones I am proudest of. Redaction. Grounded summary with citations. Incident triage. Change freeze check. Cost anomaly review. Reconciliation report. Escalation. Runbook lookup. Handoff note.

Each one replaced between two and five copies of the same procedure. Each one has a test suite and a version history. When a client's compliance officer asks how the agent decides what to redact, I send them one file and its tests.

## The lesson

The standard is a folder layout. That is all it is. Its value is that it gave my team permission to treat procedures as artifacts with owners, versions and tests, instead of paragraphs inside prompts that nobody could find.

Four drifting copies of a triage procedure became one file with 34 test cases. That is the whole story.

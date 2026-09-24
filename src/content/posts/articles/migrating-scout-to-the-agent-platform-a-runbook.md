---
title: "Migrating Scout to the Gemini Enterprise Agent Platform: a runbook"
description: "Vertex AI is now the Gemini Enterprise Agent Platform and ADK Python 2.0 is GA. The steps my team followed to move Scout, and the eval gate that decided when we were done."
pubDatetime: 2026-05-27T15:00:00Z
kind: article
tags: ["gcp", "adk", "agents"]
sources:
  - title: "Google I/O 2026: Gemini 3.5 Flash, Antigravity 2.0, ADK Python 2.0 GA"
    url: "https://blog.google/innovation-and-ai/technology/developers-tools/google-io-2026-collection/"
    date: 2026-05-19
  - title: "Vertex AI name retired in favor of Gemini Enterprise Agent Platform"
    url: "https://en.wikipedia.org/wiki/Gemini_Enterprise_Agent_Platform"
    date: 2026-05-21
  - title: "MCP 2026-07-28 release candidate"
    url: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/"
    date: 2026-05-21
diagram:
  caption: "The migration runbook from a frozen baseline eval to a signed-off traffic shift with rollback ready."
  nodes:
    - { id: "baseline", label: "Baseline eval, 212 cases", col: 0, kind: "tool" }
    - { id: "prompts", label: "Prompt Management", col: 0, kind: "store" }
    - { id: "port", label: "Port to ADK Python 2.0", col: 1, kind: "tool" }
    - { id: "deploy", label: "Deploy at zero traffic", col: 2, kind: "tool" }
    - { id: "shadow", label: "Shadow run, three days", col: 3, kind: "tool" }
    - { id: "gate", label: "Full eval gate", col: 4, kind: "tool" }
    - { id: "signoff", label: "Written sign-off, traffic", col: 5, kind: "human" }
    - { id: "rollback", label: "One-command rollback", col: 5, kind: "output" }
  edges:
    - ["prompts", "port", "pinned versions"]
    - ["baseline", "port", "pass criteria first"]
    - ["port", "deploy", "agents-cli"]
    - ["deploy", "shadow", "mirrored requests"]
    - ["shadow", "gate", "tools, scores, cost"]
    - ["baseline", "gate", "within one point"]
    - ["gate", "signoff", "two tone cases"]
    - ["deploy", "rollback", "old version kept"]
---

## Table of contents

## Two announcements in one week

[Google I/O](https://blog.google/innovation-and-ai/technology/developers-tools/google-io-2026-collection/) on May 19 made ADK Python 2.0 generally available. Two days later Google [retired the Vertex AI name](https://en.wikipedia.org/wiki/Gemini_Enterprise_Agent_Platform). Everything now lives under the Gemini Enterprise Agent Platform. Scout, the marketing intelligence system my team runs for Let's Forage, had been on Vertex AI Agent Engine and ADK 1.x since last autumn.

Nothing broke on May 21. Names in a console do not break running agents. But we had two migrations queued, a framework major version and a platform rename, and I wanted them done before the summer campaign season when the Apple and Meta teams use Scout most.

This is the runbook we followed. It took eleven working days. Most of that was the eval gate, not the code.

## Step zero: freeze the baseline

Before touching anything we ran the full Scout eval suite against production and stored the results as the baseline. 212 scenario cases across the nine agents, scored by a judge model on groundedness, task completion and tone, plus retrieval metrics on the research agents.

```bash
scout-eval run --env prod --tag baseline-2026-05-18 --out gs://scout-evals/baseline/
scout-eval report gs://scout-evals/baseline/ > baseline.md
```

The rule for the whole migration was written on the first page of the runbook. No cutover until the new stack scores within one point of the baseline on every agent, and no single case regresses from pass to fail without a written reason.

## Step one: ADK 1.x to 2.0 in a branch

ADK 2.0 changed how sub-agents and workflow agents compose. Our sequential research pair, research assistant then research author, moved from a `SequentialAgent` with a list to the new graph workflow form. The change is mechanical. The behavior is not guaranteed to be identical, because the framework decides how state flows between steps.

```python
# ADK 1.x
data_analysis = SequentialAgent(
    name="data_analysis_agent",
    sub_agents=[research_assistant, research_author],
)

# ADK 2.0
data_analysis = Workflow(
    name="data_analysis_agent",
    graph=Graph()
      .node(research_assistant)
      .node(research_author, after=research_assistant,
            inputs={"findings": research_assistant.output("findings")}),
)
```

The explicit `inputs` mapping is the part I like. In 1.x the author read whatever the assistant left in session state. In 2.0 we name what crosses the boundary. It also surfaced a bug we had lived with for months. The author was reading a stale `findings` key from an earlier turn when the assistant returned empty. In 2.0 that case fails loudly. We fixed it and added it to the eval suite.

Everything else in the tree, the big idea, campaign author, persona, strategy, role author and help desk agents, moved with import changes and small signature updates. Two days for the port, one for the tests.

## Step two: prompts stay where they are

Scout's prompts live in Prompt Management, not in code. This was the decision that made the migration cheap. The framework changed. The platform name changed. The prompts did not move, and the prompt versions pinned in config were the same before and after.

If your prompts are string literals in Python, a framework migration becomes a prompt migration too, and you lose the ability to tell which change caused which eval movement.

## Step three: deploy to the renamed platform

The Agent Engine deploy target is the same service under a new name and a new console path. The `agents-cli` from Cloud Next in April handles it.

```bash
agents-cli deploy \
  --project letsforage-prod \
  --agent scout-root \
  --version 2026.05.24 \
  --runtime adk-python-2.0 \
  --traffic 0
```

`--traffic 0` deploys the new version with no live traffic. It sits next to the current version, reachable by explicit version header for testing.

## Step four: shadow run

For three working days every production request to Scout was mirrored to the new version. The old version answered the user. The new version answered into a log. A small Cloud Run job compared them.

We looked at three things. Did both versions call the same tools in the same order. Did the judge score the two answers within a point of each other. Did latency and cost per session stay within 10 percent.

The tool call comparison found the only real difference. The persona agent in 2.0 called the audience lookup tool once instead of twice in about a fifth of sessions. That was an improvement. The 1.x version had been double-calling because of how the sequential state was reloaded. Cost per session went down 6 percent from that alone.

## Step five: the eval gate

On day nine we ran the full suite against the shadow version.

| Agent | Baseline | ADK 2.0 | Delta |
|---|---|---|---|
| research_assistant | 8.7 | 8.8 | +0.1 |
| research_author | 8.4 | 8.4 | 0.0 |
| big_idea | 8.1 | 8.3 | +0.2 |
| campaign_author | 8.6 | 8.5 | -0.1 |
| persona | 8.9 | 8.9 | 0.0 |
| general_strategy | 8.2 | 8.3 | +0.1 |
| role_author | 8.5 | 8.4 | -0.1 |
| help_desk | 9.1 | 9.1 | 0.0 |

Two cases moved from pass to fail. Both were in the campaign author, and both were tone cases where the judge preferred the old phrasing. We read them, agreed the new outputs were acceptable, and wrote that down in the runbook. Rule satisfied.

## Step six: traffic shift and rollback

Traffic moved 10 percent, 50 percent, 100 percent over two days with the same comparison job watching. Rollback was one command the whole time.

```bash
agents-cli traffic --agent scout-root --version 2026.04.30 --percent 100
```

We did not need it. We tested it on day ten anyway, with real traffic, for five minutes. A rollback you have not exercised is a hope.

## What about MCP

The [MCP 2026-07-28 release candidate](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) also landed on May 21. Scout's tools are internal ADK tools, not MCP servers, so nothing changed for this migration. Our enterprise knowledge agents for other clients do use MCP connectors, and the stateless core in the RC will mean work there. That is a separate runbook for July.

## The runbook, compressed

1. Freeze a baseline eval and write the pass criteria before you start.
2. Port the framework in a branch. Fix what fails loudly. Add each fix as an eval case.
3. Keep prompts out of code so they do not move.
4. Deploy at zero traffic to the new platform.
5. Shadow production for days, comparing tool calls, judge scores, latency and cost.
6. Run the full eval gate. Explain every pass-to-fail in writing.
7. Shift traffic in steps. Exercise rollback on purpose.

Eleven days. Zero user-visible incidents. One old bug found and fixed. A 6 percent cost drop we did not plan for. The name on the console is different, and Scout does not know.

---
title: "Prompt management as configuration: versions, rollouts and rollback"
description: "Prompts are not code. They are configuration with an eval suite. How my team versions them in Vertex AI Prompt Management, rolls them out to a slice of traffic, and rolls back in a minute."
pubDatetime: 2026-03-11T15:00:00Z
kind: article
theme: tools
tags: ["gcp", "agents", "evals"]
sources: []
---

## Table of contents

## The prompt that changed at 4 pm

Early in the Scout project, an engineer improved a prompt. The change was good. The persona agent produced tighter output on the three examples he tried. He committed it, the deploy ran, and by the next morning a client had noticed that persona descriptions had lost a field the campaign author agent depended on.

Nobody did anything wrong. The prompt was in the codebase, the codebase had tests, the tests passed. The tests did not cover the thing that broke because prompts do not fail like code. Code fails loudly. A prompt fails by producing something slightly different, and the difference matters three agents downstream.

That was the week I stopped calling prompts code.

## Prompts are configuration

Configuration has a few properties. It changes more often than code. It changes for reasons that are not bugs. It is owned by more than engineers. And it needs to be swappable without a deploy.

Prompts have all four. The persona prompt changed because a client's brand team wanted a different tone. That is not a bug fix. It should not need a pull request against the application, a build, and a container rollout. It should need a review by someone who understands the output, an eval run, and a switch.

So we moved every prompt out of the code and into Vertex AI Prompt Management. The code references a prompt by name and a version label. The runtime fetches it.

```python
prompt = prompts.get("scout/persona_agent", label="prod")
agent = Agent(
    name="persona_agent",
    model=settings.model_for("persona_agent"),
    instruction=prompt.text,
    tools=[dashboard_lookup, audience_profile],
)
```

That label is where the whole discipline lives.

## Versions and labels

Every save creates an immutable version. Versions never change. Labels point at versions and labels move.

We use four labels. `dev` is whatever someone is working on. `candidate` is a version that passed the eval suite and is waiting for rollout. `canary` is live on a slice of traffic. `prod` is live for everyone.

Moving a label is a deliberate act with an audit entry. Who moved it, from which version to which, and the eval run id that justified it. Compliance clients ask for exactly this record, and it fell out of the design for free.

## The eval gate

A version cannot get the `candidate` label unless the eval suite passes. The suite for each agent is a fixed set of cases, scored by a judge model that is not the one running the agent, plus any deterministic checks. For the persona agent one deterministic check is "output contains every field in the PersonaSchema." That is the check that would have caught the 4 pm change.

The suite runs in CI on every prompt save. It takes about six minutes for Scout. The engineer sees a score diff against the current prod version, per case, before deciding whether to promote.

We also run the downstream agents on the candidate's output. The persona agent's eval includes ten cases where the campaign author consumes the persona. If the campaign author's score drops, the persona change does not promote, even if the persona score went up.

## Canary rollouts

Promotion to `prod` is never direct. A candidate becomes `canary` first. The runtime routes a configured share of sessions, usually ten percent, to the canary label. The rest stay on prod.

For two to three days we watch three numbers side by side. Judge score on a sample of live sessions. Cost per session. Human override rate where a reviewer is in the loop. If canary matches or beats prod on all three, the label moves. If not, the canary label is removed and everything is back on prod within a minute.

Rollback is a label move. No deploy. No container. That has saved us twice.


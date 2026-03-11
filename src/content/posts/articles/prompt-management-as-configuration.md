---
title: "Prompt management as configuration: versions, rollouts and rollback"
description: "Prompts are not code. They are configuration with an eval suite. How my team versions them in Vertex AI Prompt Management, rolls them out to a slice of traffic, and rolls back in a minute."
pubDatetime: 2026-03-11T15:00:00Z
kind: article
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

## Who may edit

This is the part most teams skip. Once prompts are configuration, more people can change them, and that is the point. The brand team at a media client edits tone guidance directly. A compliance officer at a healthcare client owns the sentence that says what the agent must never write.

Permissions map to labels. Anyone on the project can create a version and get the `dev` label. Promoting to `candidate` requires a passing eval run, which anyone can trigger. Moving `canary` and `prod` requires a named owner per agent, and there are two for each so nobody is a single point of failure on a Friday.

Every change has a required note. "Client asked for shorter openings" is enough. Empty notes are rejected. Six months later, when someone asks why the prompt says what it says, the answer is in the history.

## Prompts and models change together

A prompt is tuned against a model. Change the model and the prompt that scored well can drop. So the version record for a prompt includes the model it was evaluated against, and a model change is treated exactly like a prompt change. New candidate, full eval, canary, promote.

When Gemini 3.1 Pro arrived in February, we did not swap it in. We created candidate versions of each affected prompt with the new model recorded, ran the suites, and found two agents whose scores fell. Their instructions leaned on a phrasing quirk of the older model. We rewrote those two, re-ran, and promoted all of them together over a week of canary.

The alternative, changing the model in a config file and deploying, is what most teams do. It works until it does not, and when it does not the failure is spread across every agent at once with no record of which prompt was tuned for what.

## What this costs

An extra fetch at agent startup, cached for the life of a session. Six minutes of CI per prompt save. Two or three days of canary before a change reaches everyone.

The last one is the one engineers push back on. It feels slow. My answer is that the alternative is not faster. The alternative is the 4 pm change, discovered at 9 am, diagnosed by noon, and rolled back with a deploy at 2 pm, after a client noticed. Three days of canary is cheap.

## The rule

Treat the prompt like the config it is. Version it. Gate it with an eval. Roll it out to a slice. Make rollback a label. Let the people who understand the output own the words, and keep the record of every change.

The model is what it is. The prompt is the part you control. Control it properly.

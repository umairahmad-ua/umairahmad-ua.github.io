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


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


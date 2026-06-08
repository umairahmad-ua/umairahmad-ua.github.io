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


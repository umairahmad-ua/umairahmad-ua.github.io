---
title: "A clinical documentation assistant that never writes the diagnosis"
description: "How we built an ambient note-drafting assistant for a healthcare client with hard boundaries on what it will and will not write, and why the boundaries are the product."
pubDatetime: 2026-01-14T15:00:00Z
kind: article
theme: industry
tags: ["healthcare", "agents", "gcp"]
sources:
  - title: "OpenAI introduces ChatGPT Health"
    url: "https://openai.com/index/introducing-chatgpt-health/"
    date: 2026-01-07
  - title: "Anthropic unveils Claude for Healthcare"
    url: "https://fortune.com/2026/01/11/anthropic-unveils-claude-for-healthcare-and-expands-life-science-features-partners-with-healthex-to-let-users-connect-medical-records/"
    date: 2026-01-11
---

## Table of contents

## Two launches and one client

In the space of five days, OpenAI launched [ChatGPT Health](https://openai.com/index/introducing-chatgpt-health/) and Anthropic launched [Claude for Healthcare](https://fortune.com/2026/01/11/anthropic-unveils-claude-for-healthcare-and-expands-life-science-features-partners-with-healthex-to-let-users-connect-medical-records/). Both aimed at patients and providers. Both careful in their language about what the models will and will not do.

My team has been building a clinical documentation assistant for a healthcare client since October. The two launches did not change our architecture. They did confirm the one decision we argued about most. The assistant drafts the note. It never writes the diagnosis.


---
title: "Multi-model agents: Gemini and Claude in one system"
description: "How my team splits agent steps between Gemini and Claude behind one MCP tool layer, evaluates each model separately, and keeps vendor risk boring."
pubDatetime: 2026-08-05T15:00:00Z
kind: article
theme: platform
tags: ["agents", "gemini", "claude", "mcp", "evals"]
sources:
  - title: "Alibaba Qwen3.8-Max cloud release"
    url: "https://github.com/QwenLM/Qwen3.8"
    date: 2026-08-03
  - title: "Claude Enterprise inference hooks beta"
    url: "https://github.com/jqueryscript/anthropic-claude-timeline"
    date: 2026-08-05
---

## Table of contents

## The question a CFO asked

In July a client's CFO asked me a question I had not been asked before. "If Google doubled the price of Gemini tomorrow, what happens to our system?" I gave a vague answer about abstraction layers. He did not accept it. He wanted to know which parts of the system would keep running and which would stop.

I went back to the team and we drew the answer on a whiteboard. It turned out we already had a multi-model system. We had just never designed it as one. This article is what we made explicit.


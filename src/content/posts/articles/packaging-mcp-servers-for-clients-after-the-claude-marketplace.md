---
title: "Packaging MCP servers for clients after the Claude Marketplace"
description: "The Claude Marketplace opened with a plugin directory. How my team packages its BigQuery, CRM and ops MCP servers as versioned plugins with skills, permission scopes and eval fixtures, and which ones stay private."
pubDatetime: 2026-09-30T15:00:00Z
kind: article
theme: tools
tags: ["mcp", "agents", "claude"]
sources:
  - title: "Anthropic launches the Claude Marketplace"
    url: "https://claude.com/blog/claude-marketplace"
    date: 2026-09-23
  - title: "Build plugins for Claude"
    url: "https://claude.com/blog/build-plugins-for-claude"
    date: 2026-09-23
  - title: "Anthropic: Claude Sonnet 5.5"
    url: "https://www.anthropic.com/claude-sonnet-5-5"
    date: 2026-09-28
  - title: "Claude for Government is now generally available"
    url: "https://claude.com/blog/claude-for-government-is-now-generally-available"
    date: 2026-09-30
---

## Table of contents

## A directory changes the question

Anthropic opened the [Claude Marketplace](https://claude.com/blog/claude-marketplace) last Wednesday with more than two thousand connectors and plugins, plus a listing for service partners. The [plugin submission portal](https://claude.com/blog/build-plugins-for-claude) followed on Friday. Zazmic is listed as a partner.

Until last week, the MCP servers my team built lived in client repositories. Each client had its own copy of the BigQuery server, its own CRM connector, its own ops tools. The question was always "does this work for this client". A public directory changes the question to "which of these is a product, and which is a client's private plumbing". This piece is how we answered it, and how we now package the ones that travel.


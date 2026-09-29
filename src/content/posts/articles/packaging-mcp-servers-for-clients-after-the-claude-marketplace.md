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

## The three servers

We have built many MCP servers. Three of them appear in almost every engagement.

**The BigQuery server.** Tools for listing datasets a user can see, describing a table, running a read-only query under a byte limit, and fetching a named metric from a semantic layer. The semantic layer is the part that makes it safe for finance users.

**The CRM connector.** Tools for looking up an account, listing recent interactions and drafting a note, against whichever CRM the client runs. The tool contracts are identical across clients. The adapters behind them are not.

**The ops toolkit.** Read-only logs, metrics and deploy history, plus the scoped execution tools that the operations agent uses after a human approves. The approval loop I described two weeks ago is built on this.

## What a plugin is, in our terms

A plugin is a versioned bundle that a Claude surface can install. For us it has five parts.

1. **The MCP server** with a manifest that lists every tool, its input and output schema, and its permission scope.
2. **A skill** that tells the agent when and how to use those tools. The skill carries the procedure. The server carries the capability.
3. **Permission scopes** declared per tool. Read, write, execute. A plugin that declares only read scopes can be installed by a wider set of users.
4. **Eval fixtures.** A folder of recorded tool calls and expected outputs. An installer can run them against their own data to see whether the plugin behaves.
5. **A changelog and a version.** Semantic versioning on the tool contracts. A breaking change to an output schema is a major version.

The fifth part is the one teams skip and the one that matters most once a plugin is installed in places you do not control. I wrote about tool contracts that do not rot last December. A directory is where rot becomes visible.

## Public, partner, or private

We sorted every server into one of three tiers.

**Public** means listed in the directory for anyone. The BigQuery server qualifies. Its tools are generic, its scopes are read-only by default, and the semantic layer is configuration the installer supplies. We removed one tool before listing it, a convenience that ran arbitrary SQL under a service account. Convenient for us, wrong for strangers.

**Partner** means shared with clients through the partner listing but not public. The CRM connector is here. The contracts are generic, the adapters contain client-specific field mappings, and the eval fixtures contain shapes of real records even after redaction. A client installs a build we prepare for them.

**Private** means it never leaves the client's project. The ops toolkit is private, every time. Its execution tools are scoped to one client's playbooks and one client's service accounts. There is no version of it that is safe to install elsewhere, and there should not be.

The test we used: if a stranger installed this and something went wrong, would the fault be theirs or ours. Public plugins must make the answer theirs, through scopes and configuration. If we cannot make it so, the plugin is not public.


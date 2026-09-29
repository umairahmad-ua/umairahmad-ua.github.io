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

## The packaging work nobody budgets for

Turning a server into a plugin took about two weeks per server for the first two. Most of that was not code.

Writing the skill properly was the first week. The server already worked. What did not exist was a clear statement of when to use the metric tool versus the query tool, what to do when a table is not visible to the user, and how to phrase a refusal. All of that lived in prompts scattered across client agents. The skill collects it in one place.

Eval fixtures were the second week. We had evals for the agents that used the server. We did not have evals for the server alone. Recording forty tool calls with expected outputs, scrubbing them, and writing a runner that an installer can execute was new work. It was also the work that found two bugs in schema handling that three clients had been living with.

## Versioning across clients

Before the marketplace, each client was on whatever version of the server we last deployed. Now there is one version number and a changelog, and the question "which version are you on" has an answer. We moved every client to the current major version before listing. Two of them needed a one-line change in an agent prompt where a tool output had been renamed. That is the kind of drift a directory forces you to clean up.

## Models, briefly

[Claude Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5) arrived on Monday at Sonnet 5 pricing and noticeably faster. The plugins do not care which model calls them, which is the point of the contract. We did re-run the plugin eval fixtures with Sonnet 5.5 as the caller. Everything passed. One tool that returns a long table got called with a tighter row limit than before, which is the model being sensible about context, and it changed nothing downstream.

[Claude for Government](https://claude.com/blog/claude-for-government-is-now-generally-available) also went GA today with FedRAMP High. We have no government clients. The partner listing now gets questions from people who do, and the packaging work above is what makes it possible to say yes to a conversation.


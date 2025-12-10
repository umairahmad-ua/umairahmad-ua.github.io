---
title: "MCP tool contracts that do not rot"
description: "A practical guide to designing tool interfaces for agents under the Model Context Protocol: names, types, errors, idempotency, versions, and the gap between schema and model."
pubDatetime: 2025-12-14T15:00:00Z
kind: article
theme: tools
featured: true
tags: ["mcp", "agents"]
sources:
  - title: "One year of MCP: the 2025-11-25 specification release"
    url: "https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/"
    date: 2025-11-25
  - title: "Linux Foundation announces the Agentic AI Foundation"
    url: "https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation"
    date: 2025-12-09
---

We had a tool called `get_data`. It took a string called `query`. It returned a string. For about two weeks it was the most called tool in the system and nobody could say what it did, because what it did depended on what the model typed into `query` that day.

I deleted it. The replacement was four tools with boring names and typed arguments. The agent got more accurate the same afternoon, and I did not change a single prompt.

That is the whole thesis of this post. The tool contract is part of the prompt. It is the part you can type check.

## Table of contents

## Why now

The Model Context Protocol had its first anniversary on November 25 with a new specification release. Tasks arrived as an experimental primitive, OpenID Connect discovery landed for auth, and elicitation gained a URL mode. Two weeks later, on December 9, Anthropic donated the protocol to the new Agentic AI Foundation under the Linux Foundation, alongside OpenAI's AGENTS.md and Block's goose.

I read both announcements the same way. The protocol is now infrastructure. The tools you write against it will outlive the model that first calls them. So they had better be designed like infrastructure and not like a demo.

Everything below is what I do on the tools my team exposes to agents at Zazmic, and what I wish I had done two years earlier on the LangChain tools I wrote at Developers Inc.

## Name the verb and the noun

A tool name is the first thing the model reads. `get_data` says nothing. `list_campaign_metrics` says what comes back and roughly how much of it.

I use verb plus noun, and I keep the verb from a short list. `get` returns one thing by id. `list` returns many with a filter. `search` returns ranked results for a query. `create`, `update` and `delete` do what they say and nothing else. When a tool needs a verb outside that list, I stop and ask whether it is really two tools.

The model does not need creativity from your names. It needs to predict what happens when it calls them.

## Type the inputs, and type the outputs too

Every MCP tool declares an input schema. Most people stop there. The output is where the rot sets in.

A tool that returns free text forces the model to parse prose to find the number. Sometimes it finds a different number. A tool that returns a typed object with the number in a named field is one the model can quote without paraphrasing.

Here is a bad one. It is close to what `get_data` looked like.

```json
{
  "name": "get_data",
  "description": "Gets data from the dashboard.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    }
  }
}
```

Here is what replaced it, one of the four.

```json
{
  "name": "list_campaign_metrics",
  "description": "List daily metrics for one campaign over a date range. Returns at most 90 days per call. Use next_cursor to page.",
  "inputSchema": {
    "type": "object",
    "required": ["campaign_id", "start_date", "end_date"],
    "properties": {
      "campaign_id": { "type": "string", "pattern": "^cmp_[a-z0-9]{12}$" },
      "start_date": { "type": "string", "format": "date" },
      "end_date": { "type": "string", "format": "date" },
      "metrics": {
        "type": "array",
        "items": { "type": "string", "enum": ["impressions", "clicks", "spend_usd", "conversions"] },
        "default": ["impressions", "clicks", "spend_usd"]
      },
      "cursor": { "type": "string" }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["rows", "currency"],
    "properties": {
      "rows": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["date"],
          "properties": {
            "date": { "type": "string", "format": "date" },
            "impressions": { "type": "integer" },
            "clicks": { "type": "integer" },
            "spend_usd": { "type": "number" },
            "conversions": { "type": "integer" }
          }
        }
      },
      "currency": { "type": "string", "const": "USD" },
      "next_cursor": { "type": ["string", "null"] }
    }
  }
}
```

It is longer. It is also the last time anyone on the team asked what the tool returns.

Three details in there earn their keep. The `pattern` on the id stops the model from inventing ids that look plausible. The `enum` on metrics stops it from asking for a metric that does not exist. The `const` on currency means the model never has to guess the unit, and the agent's answer never says "dollars" when it should say "cents."


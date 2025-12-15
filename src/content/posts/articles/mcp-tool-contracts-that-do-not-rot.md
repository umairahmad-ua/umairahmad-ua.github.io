---
title: "MCP tool contracts that do not rot"
description: "A practical guide to designing tool interfaces for agents under the Model Context Protocol: names, types, errors, idempotency, versions, and the gap between schema and model."
pubDatetime: 2025-12-14T15:00:00Z
kind: article
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

## Errors the model can act on

Tools fail. The question is what the model does next.

If the tool returns a stack trace, the model apologizes to the user and stops. If the tool returns a structured error with a code and a hint, the model can often recover without anyone noticing.

```json
{
  "error": {
    "code": "date_range_too_wide",
    "message": "Range is 210 days. Maximum is 90.",
    "hint": "Split the request into ranges of 90 days or fewer and call again.",
    "retryable": true
  }
}
```

The `hint` field is written for the model. It is an instruction disguised as an error. The `retryable` flag tells the model whether trying again is even worth it. I have watched an agent read that hint, split the range into three calls, and merge the results without a prompt telling it to. That is the tool doing the prompting.

Keep the code list short and stable. Every new error code is a new thing the model has to learn to handle. Ten codes is plenty. Fifty is a design smell.

## Idempotency, or the tool that charged the card twice

Any tool that writes needs an idempotency key. The model will retry. Not because it is broken, but because retrying is what it does when a response is slow or a network call drops. If `create_campaign` is not idempotent, you will create two campaigns and learn about it from the client.

The pattern is simple. The input schema has a required `request_id` string. The server stores the result under that id for a day. A second call with the same id returns the first result. The model does not need to understand this. It just needs the instruction to generate one id per intended action, which is one sentence in the agent prompt.

Read tools should be idempotent by nature. If a `list` call returns different results for the same arguments within a session, the agent's reasoning becomes unreproducible and your evals become noise.

## Pagination the model will actually follow

Big result sets need paging. Models are bad at paging when the contract is implicit. They fetch page one and declare victory.

Two rules fix most of it. Return an explicit `next_cursor` that is null when there is no more data, so the absence is a fact and not an inference. And put the page size limit in the tool description in plain words, as the example above does, so the model knows before the first call that more than one may be needed.

Do not paginate with offsets. Models increment them wrong. Cursors are opaque and the model treats them as tokens to pass back, which is exactly what you want.

## Versioning without breaking the agent

You will change a tool. When you do, the agent's prompt, its eval cases and possibly its fine-tuning data all encode the old shape.

I version at the name level for breaking changes. `list_campaign_metrics` becomes `list_campaign_metrics_v2` and both run for a release. The agent prompt is updated to prefer v2. The eval suite runs against both. When the v1 call count in traces hits zero for two weeks, v1 is removed.

Additive changes do not need a new name. A new optional input field or a new output field is safe as long as defaults are sensible. The `outputSchema` is what makes this safe. If a client parses by field name and the fields keep their names and types, nothing breaks.

## The gap between the schema and the model

Everything above assumes the model reads the schema and does what it says. It mostly does. Not always.

The description field is the part of the contract that does the most work and gets the least attention. The schema says what is allowed. The description says what is wise. "Returns at most 90 days per call" is not enforceable by a type. It is exactly the sentence that stops the model from asking for a year of data in one call.

I write descriptions as instructions to a careful colleague who has never seen the system. What does this do. What does it not do. When should you call it instead of the similar-sounding tool next to it. That last one matters more as the tool count grows. Two tools with overlapping descriptions produce a model that flips a coin.

And I test the description. The eval harness I wrote about last month has tool-choice as a rubric dimension. When a tool's description changes, the cases where the model should pick that tool run again. If it starts picking the neighbor, the description was the bug.

## The list

Verb plus noun from a short list of verbs. Typed input and typed output. Constrain ids, enums and units in the schema. Errors with a code, a hint and a retryable flag. Idempotency keys on every write. Cursors, never offsets, and a null cursor at the end. Version by name for breaking changes. Write the description for a careful stranger, and test it.

None of this is specific to MCP. MCP just made it the default way tools reach models, which means these decisions now outlive the project you made them in. `get_data` lived two weeks. Its replacements are still running. That is the difference a contract makes.

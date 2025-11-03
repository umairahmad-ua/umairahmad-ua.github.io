---
title: "Streaming agent responses over WebSockets from Cloud Run"
description: "How my team streams partial tokens and tool progress from multi-agent systems on Cloud Run, what broke, and what idle sockets cost us."
pubDatetime: 2025-11-05T15:00:00Z
kind: article
theme: tools
tags: ["agents", "gcp", "infra"]
sources:
  - title: "OpenAI and AWS multi-year compute partnership"
    url: "https://openai.com/index/aws-and-openai-partnership/"
    date: 2025-11-03
---

## Table of contents

## The forty second wait

A brand strategist at a media client typed a question into Scout and waited. The root agent routed to the research pair, the research pair called Vertex AI Search twice, the author agent wrote a page. Forty seconds passed. The strategist assumed it had crashed and refreshed the page. The answer arrived into a session nobody was watching.

Nothing was broken. The system was doing exactly what we designed. It just did not tell anyone.

That was the week I stopped treating streaming as polish. For a multi-agent system, streaming is the difference between a user who trusts the tool and a user who refreshes. This article is how we built it on Cloud Run, and the parts I would do differently.

## What to stream

A chat product streams tokens. An agent system has more to say than tokens.

We settled on four event types over one WebSocket:

- `token`: a partial chunk of the final answer.
- `agent`: which agent is active and why it was chosen.
- `tool`: a tool call started, finished, or failed, with a short label.
- `done`: the final message, citations, and the cost summary.

The `agent` and `tool` events matter more than the tokens. A user who sees "Research assistant is searching your campaign data" at second three will wait forty seconds. A user who sees nothing will not wait ten.

Here is the shape we send:

```python
from pydantic import BaseModel, Literal

class StreamEvent(BaseModel):
    type: Literal["token", "agent", "tool", "done", "error"]
    session_id: str
    seq: int
    agent: str | None = None
    label: str | None = None
    text: str | None = None
    payload: dict | None = None
```

The `seq` field looks unnecessary until the first reconnect. Then it is the only thing that lets the client know what it missed.


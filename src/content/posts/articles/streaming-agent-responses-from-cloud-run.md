---
title: "Streaming agent responses over WebSockets from Cloud Run"
description: "How my team streams partial tokens and tool progress from multi-agent systems on Cloud Run, what broke, and what idle sockets cost us."
pubDatetime: 2025-11-05T15:00:00Z
kind: article
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

## The Cloud Run part

Cloud Run supports WebSockets. It also has opinions about them.

Requests have a timeout, and a WebSocket is a long request. We set the timeout to the maximum of sixty minutes and treat any socket older than fifteen minutes as suspect. Session affinity is available but not guaranteed. A reconnect can land on a different instance, which means the instance that holds your in-flight agent run is not the one you are now talking to.

The fix is to never let a Cloud Run instance own the stream. The agent run publishes events to Redis pub/sub on a channel keyed by session. Any instance that holds a socket for that session subscribes and forwards. If the socket drops and the client reconnects to a different instance, that instance subscribes to the same channel and picks up from the next event.

```python
async def forward(session_id: str, ws: WebSocket, last_seq: int):
    channel = f"scout:stream:{session_id}"
    async with redis.pubsub() as sub:
        await sub.subscribe(channel)
        # replay anything the client missed from a short-lived list
        for raw in await redis.lrange(f"{channel}:buf", 0, -1):
            ev = StreamEvent.model_validate_json(raw)
            if ev.seq > last_seq:
                await ws.send_text(raw)
        async for msg in sub.listen():
            if msg["type"] == "message":
                await ws.send_text(msg["data"])
```

The buffer list holds the last two hundred events with a ten minute expiry. That covers every reconnect we have seen in production. It does not cover a user who closes the laptop and comes back after lunch. For that case the `done` event is also written to Firestore, and the client fetches the finished answer on load.

## Reconnects are the normal case

I expected reconnects to be rare. They are not. Corporate Wi-Fi, laptop sleep, a browser tab in the background for six minutes, a load balancer that recycles connections. Something like one session in twelve reconnects at least once.

The client sends `last_seq` on reconnect. The server replays from the buffer. The user sees the stream continue. Before we added this, the user saw the stream restart from the beginning or, worse, saw nothing because the events had already been published to a socket that no longer existed.

One more thing about reconnects. The agent run must not care whether anyone is listening. Early on we had a run that awaited the socket send inside the agent loop. When the socket dropped, the run raised, the agent stopped, and the work was lost. Now the run publishes to Redis and moves on. Whether a human is at the other end is not the agent's problem.

## Tool progress without leaking

The `tool` event needs a label a user can read. The raw tool call is not that. "vertex_search(query='Q3 Gen Z skincare TikTok', filter='brand_id=...')" is not something a brand strategist should see, and in a multi-tenant system it can leak a query that belongs to a different tenant if the routing is wrong.

Each tool declares a human label template. The runtime fills it from the arguments it is allowed to show. `Searching your campaign data for "Gen Z skincare"` is fine. The filter is not shown. This is a small design choice that saved us from a support ticket later, when a client asked why they could see another brand's identifier in a progress message during a staging test. They could not, because the label template never included it. I like problems that were prevented before they became a story.

## What idle sockets cost

Cloud Run bills for instance time while a request is open. A WebSocket is an open request. A user who opens Scout at nine and leaves the tab open until five holds an instance slot for eight hours.

We measured it. Before we changed anything, roughly a third of our billed instance time was sockets with no traffic. That is not a rounding error.

Three changes brought it down:

1. The client sends a heartbeat every thirty seconds. The server closes any socket that misses two.
2. A socket with no agent run in progress and no activity for five minutes is closed. The client reconnects on the next user action.
3. Minimum instances stays at zero for the streaming service. Cold starts add about two seconds to the first event. That is acceptable for a tool people use a few times a day. It would not be for a support chat.

After these changes idle time dropped to a small fraction of what it was. The cost line went with it.

## What I would do differently

Start with the event schema, not the transport. We started with the socket and bolted the event types on. The schema is what the frontend, the logs, and the evals all depend on. It should have been the first commit.

Log every event with its sequence number. When a client says the stream froze at "Campaign author is writing", the log tells you whether the author agent was slow or whether the socket dropped after event forty-one. Without sequence numbers you are guessing.

Do not stream from the agent process. Publish, and let a thin forwarder own the socket. It feels like an extra hop. It is what makes reconnects boring.

## The week outside

Little of this week's news touched our work directly. OpenAI announced a [large compute partnership with AWS](https://openai.com/index/aws-and-openai-partnership/) on Monday. Capacity deals at that size tell me the labs expect demand to keep climbing. For a team on Google Cloud that mostly means model prices keep moving and our routing logic needs to keep up.

The forty second wait is now a forty second stream. The strategist watches the agents work. Nobody refreshes.

---
title: "Incident postmortem: the day an agent retried itself into a bill"
description: "A tool timeout, a retry policy that looked reasonable, and an agent that spent a week of budget in forty minutes. What we changed."
pubDatetime: 2026-06-24T15:00:00Z
kind: article
tags: ["agents", "infra", "evals"]
sources:
  - title: "Amazon Bedrock AgentCore Harness generally available"
    url: "https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-bedrock-agentcore-harness-generally-available/"
    date: 2026-06-17
diagram:
  caption: "After the incident, a fleet circuit breaker, a spend rate limit and a parked queue sit between the agent and the slow API."
  nodes:
    - { id: "queue", label: "Intake document queue", col: 0, kind: "source" }
    - { id: "spend", label: "Spend rate limit, $/min", col: 0, kind: "tool" }
    - { id: "chaos", label: "Weekly chaos eval in CI", col: 0, kind: "tool" }
    - { id: "agent", label: "Intake agent, 1 alt retry", col: 1, kind: "agent" }
    - { id: "breaker", label: "Fleet circuit breaker", col: 2, kind: "tool" }
    - { id: "tool", label: "Claims lookup tool", col: 3, kind: "tool" }
    - { id: "parked", label: "Parked queue with reason", col: 3, kind: "store" }
    - { id: "api", label: "Client claims API (slow)", col: 4, kind: "tool" }
    - { id: "alert", label: "Alert, pause new sessions", col: 5, kind: "output" }
  edges:
    - ["queue", "agent"]
    - ["chaos", "agent", "slow tool, ceiling"]
    - ["agent", "breaker", "tool call"]
    - ["breaker", "tool", "closed: pass"]
    - ["breaker", "parked", "open: park, no alts"]
    - ["tool", "api", "10s timeout"]
    - ["tool", "breaker", "record ok or fail"]
    - ["parked", "agent", "resume on close"]
    - ["spend", "alert", "3x trailing avg"]
    - ["spend", "queue", "pause intake"]
---

## Table of contents

## What happened

On a Tuesday in June, at 2:14 in the afternoon Houston time, a document intake agent for a healthcare client started failing a tool call. The tool was a wrapper around the client's claims lookup API. The API was slow, not down. Responses came back after twelve seconds instead of two. Our tool had a ten second timeout.

The agent did what we told it to do. It retried. The retry policy was three attempts with exponential backoff. That is a sane policy for a stateless HTTP call. It is not a sane policy for a step inside a reasoning loop, because the agent also had its own instruction to try alternative approaches when a tool failed.

So the model tried the tool. The tool timed out three times. The model then reasoned that the lookup was unavailable, rewrote the query with a different member identifier format, and called the tool again. Three more timeouts. Then it tried a different tool, a broader search, which also depended on the same slow API. Three more. Then it went back to the first tool with a third identifier format.

Every attempt carried the full context window. Every attempt was a paid model call. Every attempt appended more failure text to the context, which made the next attempt longer and more expensive.

The intake queue kept feeding it new documents. Each document went through the same loop. By 2:55 our cost dashboard alert fired. By the time an engineer killed the deployment at 2:58, the agent had spent what we normally spend in a week. The client's API had recovered on its own at 2:40. The agent was still burning money on documents it had queued during the slow period.

Nobody's data was harmed. No wrong decision reached a human. The system was safe. It was also stupid, and the stupidity cost real money.

## Why our safeguards did not catch it

We had safeguards. That is the uncomfortable part. Each one was designed for a different failure.

We had a per-session token budget. Each document is one session. A session hit its cap and stopped. Then the next document started a new session with a fresh budget. The cap protected one session. It did nothing about a thousand sessions failing the same way.

We had tool timeouts. They worked exactly as specified. The problem is that a timeout on a tool tells the model "this did not work". It does not tell the model "stop trying". A reasoning model treats a failed tool the way a persistent engineer treats one. It finds another way.

We had a cost alert. It fired on a one hour rolling window. Forty minutes of spend at twenty times the normal rate was inside that window. The alert did fire, in the end. It fired late because the threshold assumed a slow drift, not a step change.

We had evals. Our eval suite for this agent covered extraction accuracy, routing correctness and a set of failure scenarios. One of those scenarios was "tool returns an error". None of them was "tool is slow for forty minutes while the queue is full". We tested the agent. We did not test the agent under the conditions of the system it lived in.

## The retry math nobody did

Here is what the loop looked like once we drew it. The tool layer retried three times. The model layer, prompted to be resourceful, tried roughly three alternative approaches. Each alternative went back through the tool layer. That is nine tool calls per approach set, and the model would sometimes run two sets. Call it eighteen tool calls and six model calls per document, where the happy path is two tool calls and two model calls.

Multiply by a queue that was growing because nothing was completing. The queue depth itself was an input to the cost, and nothing in our design treated it that way.

The AWS team put AgentCore Harness into general availability a week before this happened. I read the launch notes that evening with a specific question in mind. Every framework has an answer for retries at the tool level. Very few have an opinion about retries at the reasoning level, where the model decides to try again. That is the gap our incident lived in.

## What we changed

Five changes, in the order we made them.

First, a fleet-level circuit breaker. If the failure rate for a tool crosses a threshold across all sessions, the tool is marked open for everyone. The agent gets a specific message: "this tool is unavailable, do not attempt alternatives, park the task". The instruction to be resourceful now has an exception it can see.

```python
class ToolBreaker:
    def __init__(self, window_s=120, min_calls=20, open_ratio=0.5, cool_s=300):
        self.window = deque()
        self.opened_at = None
        self.cfg = (window_s, min_calls, open_ratio, cool_s)

    def record(self, ok: bool, now: float):
        window_s, *_ = self.cfg
        self.window.append((now, ok))
        while self.window and now - self.window[0][0] > window_s:
            self.window.popleft()

    def is_open(self, now: float) -> bool:
        window_s, min_calls, open_ratio, cool_s = self.cfg
        if self.opened_at and now - self.opened_at < cool_s:
            return True
        if len(self.window) >= min_calls:
            fails = sum(1 for _, ok in self.window if not ok)
            if fails / len(self.window) >= open_ratio:
                self.opened_at = now
                return True
        self.opened_at = None
        return False
```

Second, a spend rate limit, not just a spend cap. Dollars per minute for the whole deployment. When the rate exceeds three times the trailing average, new sessions pause and an alert fires. This catches the step change the rolling window missed.

Third, parked tasks instead of failed tasks. When the breaker is open, documents go to a parked queue with a reason. When the breaker closes, they resume from where they stopped. Before, a failed document was retried from scratch by the queue layer. That was a fourth retry loop we had not counted.

Fourth, the model-level retry budget is now explicit. The system prompt no longer says "try alternative approaches". It says "you may attempt at most one alternative approach per tool failure, then report the failure". The eval suite has a case for this. A model that tries three alternatives fails the eval.

Fifth, a chaos scenario in CI. Once a week, an eval run makes the claims tool slow for the whole run and confirms that total spend stays under a ceiling. This is the test that would have caught the incident. It is embarrassing how obvious it is in hindsight.

## What it cost and what it saved

The incident cost roughly one week of this agent's normal budget. The five changes took the engineers I lead and mentor about six working days, spread across two people. Since then the breaker has opened four times in production, twice for the same client API. Each time the agent parked work and resumed. Total cost of those four events was less than one normal hour.

The client never noticed either. That is the outcome I care about most.

## The lesson I keep

An agent is a loop that spends money. Every safeguard I had was built for a request, not a loop. Timeouts protect a request. Budgets protect a session. Neither protects a fleet of loops that all fail the same way at the same time.

Now when I review an agent design, I ask one question before any other. What happens when the slowest dependency gets slow for an hour while the queue is full. If the answer involves the word "retry" without a number attached, the design is not done.

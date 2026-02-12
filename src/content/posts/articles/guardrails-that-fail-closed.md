---
title: "Guardrails that fail closed: a policy layer for agents"
description: "Input and output policies, tool allowlists, and the decision that matters most: what the agent does when the policy service itself is down."
pubDatetime: 2026-02-11T15:00:00Z
kind: article
tags: ["security", "agents", "gcp"]
sources:
  - title: "Anthropic releases Claude Opus 4.6"
    url: "https://www.anthropic.com/news/claude-opus-4-6"
    date: 2026-02-05
  - title: "OpenAI Frontier enterprise agent platform"
    url: "https://openai.com/index/introducing-openai-frontier/"
    date: 2026-02-05
---

## Table of contents

## The outage that taught us the rule

In January a policy service my team runs went down for nine minutes. It sits between our agents and their tools. Every tool call passes through it and gets a yes or a no.

For those nine minutes, one agent kept working. It had been written to treat a timeout as a yes. The other agents stopped. They had been written to treat a timeout as a no.

Nothing bad happened. The agent that kept working was a read-only research agent. But the review afterwards was uncomfortable, because the difference between the two behaviors was one line of code and nobody had made the decision on purpose.

We now have a rule. Guardrails fail closed. If the policy layer cannot answer, the answer is no.

## What the policy layer does

I think of guardrails as three separate checks, and I keep them separate in code because they change at different speeds.

**Input policy.** What is the user allowed to ask this agent. For a healthcare client this blocks requests that would need a clinician. For a finance client it blocks anything that looks like a request for advice rather than information. This check runs on the user message before the model sees it.

**Tool policy.** What is this agent allowed to do, with which parameters, on behalf of which user. This is an allowlist, not a denylist. An agent starts with zero tools and each one is granted with a scope. The cloud operations agent I run can restart a service in staging without asking. In production it can propose the restart and a human presses the button.

**Output policy.** What can leave. PII that was not in the input. Claims without a citation when the agent is grounded. Content that violates a brand rule for a marketing client. This runs on the model output before the user sees it.

```yaml
agent: claims-intake
input_policy:
  block: [clinical_advice, legal_advice]
  max_attachments: 5
tools:
  - name: lookup_member
    scopes: [read]
    as_user: true
  - name: submit_claim
    scopes: [write]
    requires_approval: production
output_policy:
  require_citation: true
  pii: redact_unless_in_input
on_policy_error: deny
```

That last line is the one the outage taught us to write down.

## Fail closed, then make failing rare

Fail closed is the right default and it has a cost. A down policy service means a down agent. So the second half of the work is making the policy service boring.

We run it as a small service on Cloud Run with a regional replica, and we cache decisions for identical requests for sixty seconds. Most tool calls in a session repeat the same permission check, so the cache absorbs most of the load. The policy definitions live in a config repository with the same review rules as code. A change is a pull request, and the eval suite runs against it.

The one place we allow a degraded mode is read-only tools with no PII in scope. Those can run against a stale cached policy for up to five minutes. Anything that writes, pays, sends, or touches personal data waits.

## Allowlists over denylists

Every guardrail incident I have seen in a client project came from a denylist. Someone wrote down the bad things and the agent found a thing that was not on the list.

An allowlist inverts that. The agent can do exactly the things you named with exactly the parameter ranges you named. A new capability is a deliberate addition, reviewed, with an eval case. It feels slower for the first two weeks of a project. It is faster by week six because nobody is debugging surprises.

For the ops agent this meant writing playbooks first. Restart service, scale within a range, roll back a deployment, open a ticket. Each one is a tool with a schema. The agent picks among playbooks. It does not compose raw cloud commands.

## Testing a guardrail

A guardrail with no test is a comment. We test in three ways.

Positive cases confirm allowed requests pass. Negative cases confirm blocked requests are blocked and the user gets a clear message about why. Adversarial cases are the interesting set. We collect real attempts from logs where a user tried to route around a policy, add synthetic variants, and run them on every change. The pass criterion for adversarial cases is that the block rate does not drop.

The judge model for output policy is a different model from the one generating. We rotate it. This week we added [Claude Opus 4.6](https://www.anthropic.com/news/claude-opus-4-6) as a judge for the output checks on one client. The million-token context helps when the judge needs the whole retrieved set to decide whether a claim was grounded.

## The message the user sees

A blocked request is a moment where trust is won or lost. Early on our agents said "I cannot help with that." Users read it as a broken product and retried with different wording until something got through. That is the behavior a guardrail is supposed to prevent, and the vague message was causing it.

Now every block carries a reason category and a next step. "This looks like a request for clinical advice. I can find the policy document or connect you with the nurse line." The category comes from the policy that fired. The next step is written per category by the client's own team, because they know who the user should talk to.

Two effects. Retry-around attempts dropped in the logs once people understood the boundary. And the support team stopped getting tickets that said the agent was broken. It was not broken. It was declining, and now it says so in a way a person can act on.

## Where the industry is going

Both large labs announced enterprise agent products last week. Anthropic's Opus 4.6 came with agent teams in Claude Code, and OpenAI announced [Frontier](https://openai.com/index/introducing-openai-frontier/), an enterprise platform for running agents. Both put permissions and audit at the center of the pitch.

I read that as a good sign. A year ago the pitch was capability. Now the pitch is control. My clients never asked how smart the agent was. They asked what it could not do, and who would know if it tried.

## What I tell a client on day one

Three things. The agent starts with no permissions and earns them one tool at a time. Every guardrail has a test, and the tests run before every change. When the guardrail cannot decide, the agent stops.

That last one costs you availability. It buys you the right to say, in the room where the incident is being reviewed, that the system did exactly what you designed it to do. I have been in that room. It is a much better room when you can say that.

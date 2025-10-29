---
title: "Grounding marketing claims in first-party data: how Scout cites"
description: "Marketing agents love to generalize. Here is how Scout, our agent system for Let's Forage, ties every insight to the client's own dashboard data or refuses."
pubDatetime: 2025-10-29T15:00:00Z
kind: article
tags: ["rag", "agents", "gcp", "evals"]
sources:
  - title: "LangChain 1.0 and LangGraph 1.0 GA"
    url: "https://changelog.langchain.com/announcements/langchain-1-0-now-generally-available"
    date: 2025-10-22
---

## Table of contents

## The sentence that got us in trouble

Early in Scout's life, the strategy agent wrote this for a brand marketer: "Gen Z audiences respond 40 percent better to unpolished creative." It sounded right. It was in the general direction of things the model had read. It had nothing to do with the client's data, and the client's team lead noticed in the first review.

Scout is the multi-agent marketing intelligence system my team built for the Let's Forage platform. The people using it work on brands like Apple and Sephora. They have their own dashboards, their own campaign data, and their own reasons for not trusting a number they cannot trace. That one sentence cost us a week of credibility.

The fix became a design principle. Every quantitative claim in a Scout answer is either grounded in the client's first-party data with a citation, or it is not made.

## What first-party data looks like here

Let's Forage analyzes short-form video across platforms and gives brand teams a dashboard of cultural signals. Trends, creators, formats, engagement by audience segment. Scout's job is to answer questions about that dashboard and turn the answers into campaign ideas.

The data the agents may cite:

- Dashboard metrics for the client's own brand and tracked competitors
- Campaign performance the client has connected, including Meta ads data
- Trend and creator analyses the platform has computed for that client

Not on the list: anything the model knows from training. General marketing wisdom is allowed as framing. It is not allowed as a number.

## The retrieval layer

All citable content is indexed in Vertex AI Search with a data store per client. Each document is a small, self-contained fact with metadata:

```json
{
  "id": "trend_2025_10_21_unpolished_creative",
  "client_id": "acme",
  "type": "trend_metric",
  "text": "Unpolished creative formats had 2.3x the engagement rate of polished formats among tracked 18 to 24 audiences, Oct 7 to Oct 21, 2025, n=1,842 videos.",
  "as_of": "2025-10-21",
  "source_view": "dashboard.trends.format_engagement",
  "url": "/dashboard/trends/formats?range=2025-10-07..2025-10-21"
}
```

The text is written by a templating layer from the dashboard's own numbers, not by a model. That matters. The thing being cited is a deterministic sentence generated from a query. When the agent quotes it, the quote is true by construction.

## Citation spans, not footnotes

Agents return structured output. Every claim carries the ids of the facts that support it.

```python
class Claim(BaseModel):
    text: str
    evidence: list[str]      # fact ids from the client's data store
    kind: Literal["quantitative", "qualitative", "recommendation"]

class Answer(BaseModel):
    claims: list[Claim]
    caveats: list[str]
```

A quantitative claim with an empty evidence list fails validation before the answer reaches the user. The agent gets one retry with the validation error. If it still cannot find evidence, the claim is dropped and a caveat is added: "I could not find data in your dashboard on format engagement for this audience."

Qualitative claims and recommendations may have empty evidence. "Consider testing a creator-led format" is a suggestion, not a fact. The UI renders the two differently. Numbers are underlined and link to the dashboard view. Suggestions are plain text.

## The groundedness judge

Validation checks that evidence exists. It does not check that the evidence supports the claim. For that we run a judge model on every quantitative claim in the eval suite and on a sample in production.

The judge sees the claim text and the evidence texts and answers one question: does the evidence fully support the claim, partially support it, or not support it? Partial is the interesting category. "Engagement was 2.3x higher" is fully supported. "Gen Z prefers unpolished creative" from the same evidence is partial, because the data covers 18 to 24 and one two-week window.

Our eval threshold is 95 percent fully supported on the quantitative claims in the suite. A prompt change that drops below that does not merge. In production, the sampled judge rate has stayed between 94 and 97 percent since we introduced the structured output. Before it, the same measure was closer to 70.

## Refusal as a feature

The hardest product decision was letting Scout say no. A marketer asks how their audience compares with a competitor's on a metric the platform does not track for that competitor. The old behavior was to answer anyway from general knowledge. The new behavior:

> Your dashboard tracks format engagement for your brand and two competitors, but not for the one you named. I can compare against the two tracked competitors, or you can add the third in settings.

Users were annoyed for about a week. Then the team lead who caught the original problem told us this was the first AI tool his team trusted with a client deck. Refusal built more trust than any answer.

## Freshness is part of grounding

A citation to a number from six weeks ago is a weaker citation than one from yesterday. Every fact carries an `as_of` date, and the agent is instructed to prefer recent facts and to state the window when it quotes one. The UI shows the date next to the underline. Marketers read that date. In one review a strategist caught that a trend claim was two campaign cycles old, which was exactly the kind of catch the system was designed to enable.

Stale facts also expire. The indexing job rewrites the data store daily from the dashboard and drops facts older than the client's chosen window. An agent cannot cite what is not in the index.

## What it took to build

The retrieval layer and the structured output took about six weeks of my team's time. The templating layer that turns dashboard queries into citable sentences was the surprising chunk. Each metric needed a sentence template, a test against the dashboard's own numbers, and a review by the Let's Forage analytics team. We wrote about eighty templates. That work is boring and it is what makes the whole system honest.

## Where the industry is heading

The tooling around this is maturing. LangChain's [1.0 release](https://changelog.langchain.com/announcements/langchain-1-0-now-generally-available) last week makes structured output and citations first-class in the graph API. We build Scout on Google ADK, but the direction is the same everywhere. Agents will be judged on what they can prove, not on what they can say.

## The rule

Numbers come from the client's data or they do not appear. Every number links to where it came from. A second model checks that the link holds. The agent is allowed to say it does not know.

Marketing agents are prone to confident generalization because marketing writing is. The fix is not a better prompt. It is a data contract the agent cannot break.

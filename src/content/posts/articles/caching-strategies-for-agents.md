---
title: "Caching strategies for agents: prompt cache, retrieval cache, tool cache"
description: "Three caches sit at different layers of an agent system. Where each one lives, when it goes stale, and what it saved on a real planning workload."
pubDatetime: 2026-05-06T15:00:00Z
kind: article
tags: ["agents", "infra", "gcp"]
sources:
  - title: "OpenAI GPT-5.5 Instant"
    url: "https://openai.com/index/gpt-5-5-instant/"
    date: 2026-05-05
  - title: "Code with Claude 2026"
    url: "https://simonwillison.net/2026/May/6/code-w-claude-2026/"
    date: 2026-05-06
diagram:
  caption: "Three caches at three layers: prompt prefix, retrieval keyed on corpus version, and tool results with per-tool TTL."
  nodes:
    - { id: "turn", label: "Agent turn", col: 0, kind: "source" }
    - { id: "prompt", label: "Gemini or Claude prompt", col: 1, kind: "model" }
    - { id: "retr", label: "Retrieval tool", col: 1, kind: "tool" }
    - { id: "tools", label: "Read tools", col: 1, kind: "tool" }
    - { id: "pcache", label: "Provider prompt cache", col: 2, kind: "store" }
    - { id: "rcache", label: "Redis, corpus version key", col: 2, kind: "store" }
    - { id: "tcache", label: "Tool cache, per-tool TTL", col: 2, kind: "store" }
    - { id: "vs", label: "Vertex AI Search + reranker", col: 3, kind: "tool" }
    - { id: "backend", label: "Product master, orders APIs", col: 3, kind: "tool" }
    - { id: "trace", label: "Cost trace hits and misses", col: 4, kind: "output" }
  edges:
    - ["turn", "prompt"]
    - ["prompt", "pcache", "stable prefix first"]
    - ["turn", "retr"]
    - ["retr", "rcache"]
    - ["rcache", "vs", "on miss"]
    - ["turn", "tools"]
    - ["tools", "tcache"]
    - ["tcache", "backend", "on miss, never writes"]
    - ["pcache", "trace"]
    - ["rcache", "trace"]
    - ["tcache", "trace"]
---

## Table of contents

## The bill that started it

In March a planning run for the apparel client cost four times what the same run cost in February. Nothing in the agent code had changed. The input had. A buyer sent a forecast file with twice the SKUs, and every specialist agent re-read the same product master on every turn. Same tokens, same tool results, same embeddings, paid for again and again inside one session.

That week I drew the three places a cache can live in an agent system. My team has used that drawing on every project since. This is what it says.

## Three layers, three caches

An agent turn touches three kinds of expensive work. The model reads a long context. A retriever pulls documents. Tools call databases and APIs. Each has a cache with different rules.

**Prompt cache.** The model provider stores a prefix of the prompt and charges less to read it again. The stable part of an agent prompt is large. System instruction, tool schemas, few-shot examples, the session summary. On our planning orchestrator that prefix is about 18,000 tokens. The variable part, the current user turn and fresh tool results, is under 2,000.

**Retrieval cache.** The same query against the same corpus returns the same chunks until the corpus changes. We key on a hash of the normalized query plus the corpus version. The corpus version bumps when the ingestion pipeline commits new documents.

**Tool cache.** A tool call with the same arguments returns the same result until the underlying system changes. This is the cache people forget. It is also the one that saved the most money.

## Prompt cache: order the prompt for it

Provider prompt caches match on prefix. Anything that changes early in the prompt invalidates everything after it. So the rule is simple. Put the things that never change first. Put the things that change every turn last.

Our ADK agents build the prompt in this order.

```python
# Stable prefix, cached across turns and across users
parts = [
    SYSTEM_INSTRUCTION,          # ~3k tokens, changes on deploy only
    TOOL_SCHEMAS,                # ~6k tokens, changes on deploy only
    FEW_SHOT_EXAMPLES,           # ~7k tokens, versioned in Prompt Management
    corpus_facts(client_id),     # ~2k tokens, changes weekly
]
# Volatile suffix, never cached
parts += [
    session_summary(session_id), # changes every few turns
    recent_tool_results,         # changes every turn
    user_turn,
]
```

The mistake we made first was putting the session summary near the top because it "sets context". It set context and destroyed the cache hit rate. Moving it below the corpus facts took the prefix hit rate from about 30 percent to over 85 percent on Gemini and a similar figure on Claude.

The [GPT-5.5 Instant](https://openai.com/index/gpt-5-5-instant/) release yesterday made the default ChatGPT model faster and cheaper again. Cheaper models do not make caching less important. They change which steps you are willing to run at all, and then those steps need caching too.

## Retrieval cache: version the corpus, not the time

The first version of our retrieval cache expired entries after one hour. That was wrong in both directions. During a planning session the corpus does not change, so an hour of expiry threw away perfectly good results. When the ingestion pipeline committed new documents, stale results survived for up to an hour.

The fix was to key on corpus version. Ingestion writes a version number to a small Firestore document when a batch completes. The retrieval tool reads that number once per session and includes it in the cache key.

```python
def retrieve(query: str, client_id: str) -> list[Chunk]:
    version = corpus_version(client_id)        # cached per session
    key = f"{client_id}:{version}:{normalize(query)}"
    if hit := redis.get(key):
        return Chunk.decode_list(hit)
    chunks = vertex_search.query(query, datastore=client_id, top_k=8)
    chunks = reranker.rerank(query, chunks, top_k=4)
    redis.set(key, Chunk.encode_list(chunks), ex=7 * 24 * 3600)
    return chunks
```

Normalization matters more than it looks. Lowercase, collapse whitespace, strip trailing punctuation. Agents phrase the same question four different ways across a session. Without normalization the hit rate on the Scout research agents was under 20 percent. With it, above 60 percent.

Reranking is inside the cache boundary on purpose. The reranker is the slow part. Caching the raw search results and reranking on every hit would have saved less than half the latency.

## Tool cache: the one that paid the bill

Back to the March bill. The materials risk agent called `get_product_master(sku)` once per SKU per turn. The capacity agent called it again. The orchestrator called it a third time when it wrote the explanation. The product master changes once a day.

We added a tool cache in the ADK tool wrapper with a per-tool policy.

```python
TOOL_CACHE_POLICY = {
    "get_product_master":   dict(ttl="1d",  scope="client"),
    "get_plant_capacity":   dict(ttl="1h",  scope="client"),
    "get_buyer_forecast":   dict(ttl="1h",  scope="session"),
    "get_open_purchase_orders": dict(ttl="5m", scope="client"),
    "submit_plan":          None,   # never cache writes
}
```

Two rules came out of this. Never cache a tool that writes. Scope the cache to what the data actually belongs to. Buyer forecasts are uploaded per session, so caching them across sessions would leak one planner's file into another planner's run.

The result on the planning workload, measured over four weeks in April, was a 58 percent drop in tool call volume and a 41 percent drop in total cost per planning run. The tool cache accounted for most of that. The prompt cache accounted for most of the rest.

## Invalidation is a product decision

Every cache has a staleness window. Choosing it is not an engineering call. It is a question for the person who owns the data.

For the apparel client, the planners told us a capacity figure that is an hour old is fine. A purchase order status that is an hour old is not, because a cancelled order changes the whole allocation. So capacity gets an hour and open orders get five minutes. Those numbers came from a thirty-minute conversation with the planning lead, not from a benchmark.

I ask three questions now on every new tool. How often does this data change. Who is hurt if the agent sees a stale value. What is the cost of a miss. The answers give the TTL and the scope.

## What Code with Claude reminded me

I followed [Code with Claude 2026](https://simonwillison.net/2026/May/6/code-w-claude-2026/) in San Francisco today from Houston. The Managed Agents updates lean on the provider handling more of the harness. That is convenient. It also moves the caching decisions out of your code and into a product you do not control.

For a coding assistant that is a fine trade. For a planning agent that touches purchase orders it is not. My team keeps the tool cache in our own layer, with our own policy table, because the staleness rules belong to the client.

## Checklist

- Order the prompt stable to volatile. Measure the prefix hit rate before and after.
- Key the retrieval cache on corpus version, not wall clock time. Normalize queries. Cache after reranking.
- Wrap every read tool with a per-tool TTL and scope. Never cache writes.
- Get staleness windows from the data owner, not from a default.
- Log cache hits and misses as part of the cost trace so the savings show up in the same dashboard as the spend.

The model got cheaper this week. The cache still decided whether the planning agent stayed in production.

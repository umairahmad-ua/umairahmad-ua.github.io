---
title: "Hybrid retrieval and reranking: the RAG blueprint I reuse"
description: "The retrieval stack my team carries from client to client, why long context did not replace it, and where I stop building and use Vertex AI Search instead."
pubDatetime: 2026-02-22T15:00:00Z
kind: article
theme: tools
tags: ["rag", "gcp", "evals"]
sources:
  - title: "Anthropic: Claude Opus 4.6"
    url: "https://www.anthropic.com/news/claude-opus-4-6"
    date: 2026-02-05
  - title: "Anthropic: Claude Sonnet 4.6"
    url: "https://en.wikipedia.org/wiki/Claude_(language_model)"
    date: 2026-02-17
  - title: "Google: Gemini 3.1 Pro"
    url: "https://en.wikipedia.org/wiki/Gemini_(language_model)"
    date: 2026-02-19
---

A media client asked us a question in January that I have heard four times now in different words. "Claude and Gemini can read a million tokens. Why are we still chunking documents?" It is a fair question. Anthropic put Opus 4.6 out on February 5 with a 1M context beta. Gemini 3.1 Pro followed on February 19. The window keeps growing.

I still build retrieval for every enterprise client. This post is the blueprint I reuse and the reasons I have not thrown it away.

## Table of contents

## Why long context did not end retrieval

Three reasons, and none of them is about model quality.

The first is that enterprise corpora are not a million tokens. They are a billion. A single client's contract archive at Developers Inc. ran to hundreds of thousands of PDFs. You cannot put that in a prompt. You have to choose, and choosing is retrieval.

The second is cost per question. Even at the prices announced this month, stuffing a hundred thousand tokens into every request is expensive at ten thousand questions a day. Retrieval that finds the right two thousand tokens is cheaper by a factor I can defend to a CFO.

The third is permissions. Row-level and document-level access rules exist in every regulated client I have worked with. Retrieval is where you enforce them. A long-context prompt has no idea which documents the user is allowed to see. The retriever does.

Long context changed how I use retrieval. I retrieve more generously now. I send whole parent sections instead of tight chunks. I stopped worrying about squeezing into four thousand tokens. But I did not stop retrieving.

## Ingestion: the boring half that decides everything

Most retrieval failures I have debugged were ingestion failures. The chunk existed. It was wrong.

The blueprint handles PDF, DOCX, HTML and scanned images. Scanned pages go through OCR first, and the OCR confidence is stored on the chunk. Low-confidence chunks get flagged for human review before they enter the index. This came from the medical claims work at Developers Inc. A misread digit in a CPT code is worse than a missing one.

Tables are extracted as tables, not flattened to text. We keep the header row with every chunk that comes from a table body. A row of numbers without its header is noise to an embedding model.

Every chunk carries metadata. Source document, page, section heading path, effective date, access group. The access group is non-negotiable. It is applied as a filter at query time, not as a post-filter after retrieval. Post-filtering leaks.

## Hierarchical chunking

I use parent-child chunking on every client now. Small child chunks, around two hundred tokens, get embedded and indexed. Each child points to a parent of around fifteen hundred tokens. Retrieval matches on children. Generation reads parents.

This gives you precise matching and enough surrounding context for the model to answer without guessing. It also makes citations honest. The citation points to the parent section, which is what a human would cite.

## Hybrid retrieval

Dense retrieval alone misses exact matches. A user asking about clause 14.3 or invoice INV-2025-08812 wants that string, not its nearest semantic neighbor. Sparse retrieval alone misses paraphrase. So we run both and fuse.

Here is the core of the function my team reuses. It is deliberately plain.

```python title="retrieve.py"
from dataclasses import dataclass


@dataclass
class Hit:
    chunk_id: str
    parent_id: str
    score: float


def reciprocal_rank_fusion(*ranked_lists: list[Hit], k: int = 60) -> list[Hit]:
    fused: dict[str, float] = {}
    parents: dict[str, str] = {}
    for hits in ranked_lists:
        for rank, hit in enumerate(hits, start=1):
            fused[hit.chunk_id] = fused.get(hit.chunk_id, 0.0) + 1.0 / (k + rank)
            parents[hit.chunk_id] = hit.parent_id
    return sorted(
        (Hit(cid, parents[cid], score) for cid, score in fused.items()),
        key=lambda h: h.score,
        reverse=True,
    )


def hybrid_retrieve(query: str, access_groups: list[str], top_k: int = 40) -> list[Hit]:
    where = {"access_group": {"$in": access_groups}}
    dense = vector_store.search(embed(query), filter=where, top_k=top_k)
    sparse = keyword_index.search(query, filter=where, top_k=top_k)
    fused = reciprocal_rank_fusion(dense, sparse)
    reranked = cross_encoder.rerank(query, fused[:top_k], top_n=8)
    return dedupe_by_parent(reranked)
```

The access filter is applied in both legs. The fusion is reciprocal rank fusion with the standard constant. The reranker sees the top forty and returns eight. Then we collapse to unique parents so the model does not read the same section twice.

## Reranking earns its latency

A cross-encoder reranker adds a hundred to three hundred milliseconds. Every client asks if we can drop it. We measured this on three client corpora. Dropping the reranker lowered answer faithfulness on every eval set, by enough that nobody chose to drop it after seeing the numbers.

The reranker is also where I put domain adaptation when a client's language is unusual. Fine-tuning the embedding model is expensive and disruptive to the index. Fine-tuning the reranker on a few thousand query-passage pairs is a weekend and touches nothing downstream.


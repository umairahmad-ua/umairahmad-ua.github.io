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


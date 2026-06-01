---
title: "Long context versus retrieval, one year later"
description: "Million-token windows are normal now. On enterprise data my team still retrieves. Cost, freshness, access control and evals explain why, with numbers from a legal client."
pubDatetime: 2026-06-03T15:00:00Z
kind: article
theme: platform
tags: ["rag", "agents", "evals"]
sources:
  - title: "Anthropic releases Claude Opus 4.8"
    url: "https://code.claude.com/docs/en/whats-new/2026-w22"
    date: 2026-05-28
  - title: "Microsoft Build 2026"
    url: "https://news.microsoft.com/build-2026-live-blog/microsoft-build-2026-live/"
    date: 2026-06-02
---

## Table of contents

## The question a client asked

A legal operations team at a mid-size insurer asked me in April why we still bother with retrieval. Their contract corpus is about 9,000 documents. Claude Opus 4.6 had a million-token beta window since February. Gemini has had long windows for longer. [Claude Opus 4.8](https://code.claude.com/docs/en/whats-new/2026-w22) arrived last week. "Just put the contracts in the prompt" was the sentence.

I wrote a version of this article in February when I described [the retrieval blueprint my team reuses](/posts/articles/the-rag-blueprint-i-reuse/). Four months and two model generations later the answer has not changed. The reasons have gotten sharper.


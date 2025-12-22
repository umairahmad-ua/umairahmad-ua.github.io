---
title: "Year end: what the eval numbers said about 2025"
description: "A quiet week, so I pulled every eval run my team logged this year and read the trends. Groundedness, tool choice, cost per task, and three surprises."
pubDatetime: 2025-12-24T15:00:00Z
kind: article
theme: evals
tags: ["evals", "agents", "gcp"]
sources: []
---

## Table of contents

## A quiet week and a full table

Nothing came out this week. The labs are off. Half my team is off. I had a day with no client calls, so I did the thing I keep saying I will do. I exported every eval run we logged since June into one BigQuery table and read it.

That is about 1,900 runs across seven agent systems. Each run has a date, an agent, a prompt version, a model, a judge score per rubric line, a retrieval score where retrieval applies, and a cost. We have been writing these rows for six months. We have never looked at them all at once.

This is what the table said. Some of it I expected. Three things I did not.


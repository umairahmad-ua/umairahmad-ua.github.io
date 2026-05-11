---
title: "Data quality agents for a BigQuery warehouse"
description: "How my team built profiling, anomaly detection and natural language rule authoring for a retailer's warehouse, and why the alert routing was the hard part."
pubDatetime: 2026-05-13T15:00:00Z
kind: article
theme: industry
tags: ["agents", "gcp", "infra"]
sources: []
---

## Table of contents

## Monday morning, wrong numbers

A retail client runs a BigQuery warehouse that feeds their Monday trading report. In February the report showed a 30 percent drop in one region. Nobody had lost 30 percent of their sales. A store hierarchy table had been reloaded with a truncated file on Sunday night, and every downstream join silently dropped rows.

The data team found it by Tuesday. The commercial team had already spent Monday in meetings about it. The client asked us for an agent that would catch this kind of failure before the report went out.


---
title: "Prior authorization agent for a healthcare payer: from fax to decision"
description: "How my team built an agent that reads faxed prior authorization requests, checks them against payer policy, and hands a reviewer a decision they can defend."
pubDatetime: 2025-09-17T15:00:00Z
kind: article
theme: industry
tags: ["healthcare", "agents", "adk", "gcp"]
sources: []
---

## Table of contents

## The fax machine is still there

A regional health payer came to us in the summer with a problem I recognized. Prior authorization requests arrive by fax. Thousands a week. A clinician's office sends a request for a procedure, a nurse reviewer reads it, checks it against the payer's medical policy, and approves, denies, or asks for more information. The average turnaround was four business days. The regulator wanted two.

I had spent two years at Developers Inc on medical claims. That system reads more than 50,000 claims a day and cut rejections by 35 percent. Prior authorization is the same documents, one step earlier in the process. The codes are the same. The policy language is the same. The difference is that a claim is a fact about care that already happened. A prior auth is a judgment about care that has not happened yet. That judgment stays with a human. Our job was to get the human everything they need in one screen.

## What the agent does and does not do

The design rule from the first meeting: the agent never makes the final decision. It prepares one. A nurse reviewer sees the request, the extracted clinical facts, the matching policy criteria, and a recommendation with the evidence for each criterion. The nurse clicks approve, deny, or request information. Every click is logged with what the nurse saw.

That rule shaped everything. We were not building a decision engine. We were building a reviewer's assistant that has read the policy manual and the fax.


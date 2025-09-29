---
title: "From LangChain chains to ADK agents: what changed in how I design"
description: "Two years of building chains taught me to think in fixed graphs. Three months on Google ADK taught me where that thinking breaks and what replaces it."
pubDatetime: 2025-09-28T15:00:00Z
kind: article
tags: ["agents", "adk", "gcp"]
sources:
  - title: "Introducing upgrades to Codex (GPT-5-Codex)"
    url: "https://openai.com/index/introducing-upgrades-to-codex/"
    date: 2025-09-15
  - title: "Google Agent Development Kit documentation"
    url: "https://google.github.io/adk-docs/"
    date: 2025-06-01
---

In July I sat in a review with a client team and drew a box diagram on the whiteboard. Ingest, retrieve, rerank, answer. Four boxes, three arrows. Someone asked what happens when the user asks a follow-up that needs a different data source. I started drawing a fifth box. Then a sixth. By the time I stopped, the diagram had eleven boxes and I no longer believed in it.

That was the moment I understood that I had spent two years designing chains, and the problem in front of me was not a chain.

## Table of contents

## Where I was coming from

At Developers Inc I built retrieval and orchestration systems on LangChain for two years. Document ingestion with OCR. Recursive and semantic chunking. Pinecone with namespace isolation. Custom chains for multi-step reasoning with Pydantic output parsing. It worked. The medical claims system I led there still runs at 50K claims a day, and rejections fell 35 percent after we put it in.

A chain is a directed graph you draw in advance. Each node has a prompt. Each edge is a decision you made before any user showed up. That is the strength. You can read the graph and know what the system will do. You can test each node in isolation. You can put a price on a run because the path is fixed.

It is also the weakness. Every new question shape means a new path. Every new path is a code change. The graph grows until nobody can hold it in their head.

## What an agent is, in practice

I joined Zazmic in June 2025 and started on Google's Agent Development Kit. The mental model is different in one important way. You do not draw the path. You describe the participants.

A root agent receives the request. It has an instruction, a model, a set of tools, and a set of sub-agents. The model reads the instruction and the request, then decides whether to call a tool, answer directly, or hand off to a sub-agent. The sub-agent does the same with its own tools. Session state travels with the conversation, so a sub-agent can read what an earlier agent found.

Here is the shape of it. This is close to what I write on a normal day.

```python
from google.adk.agents import Agent, SequentialAgent
from google.adk.tools import FunctionTool


def query_dashboard(metric: str, days: int = 30) -> dict:
    """Return the last N days of a dashboard metric for the current account."""
    # real implementation calls BigQuery scoped by session account id
    ...


researcher = Agent(
    name="research_assistant",
    model="gemini-2.0-flash",
    instruction="Pull the numbers the question needs. Do not interpret them.",
    tools=[FunctionTool(query_dashboard)],
)

author = Agent(
    name="research_author",
    model="gemini-2.0-flash",
    instruction="Write the finding in two paragraphs. Cite every number.",
)

analysis = SequentialAgent(
    name="data_analysis",
    sub_agents=[researcher, author],
)

root = Agent(
    name="response_agent",
    model="gemini-2.0-flash",
    instruction=(
        "Route analysis questions to data_analysis. "
        "Answer product questions yourself. Refuse anything else."
    ),
    sub_agents=[analysis],
)
```

The interesting line is the last instruction. In a chain, routing is code. Here, routing is a sentence. That sentence is now the most important artifact in the system, and it is not covered by a type checker.

## What stayed the same

Two things did not change at all.

Retrieval quality still decides everything. An agent with a bad index gives confident wrong answers faster than a chain does. The chunking, the hybrid dense and sparse retrieval, the reranking step, the citation format: all of it moved over unchanged from my LangChain years. The agent sits on top of retrieval. It does not replace it.

Evals still decide whether you can change anything. I had an eval set for every chain node at Developers Inc. I have an eval set for every agent at Zazmic. The cases look different. The habit is identical. If you cannot measure the change, you have not made a change. You have made a guess.

## What broke

Three things broke, and I want to be honest about them because the marketing around agents does not mention any of it.

Debugging got harder. A chain fails at a node and you read that node's input and output. An agent fails somewhere in a conversation between four models, and the trace is a transcript. Tracing tools help. Reading the transcript still takes ten times longer than reading a stack trace.

Cost stopped being predictable. A chain costs the same on every run because the path is fixed. An agent might call a tool once or six times depending on how the model reads the request. The first week we had sessions that cost forty times the median. Nothing was wrong. The model was being thorough. Thorough is expensive.

Ownership got blurry. When a chain gives a bad answer, the node owner fixes the prompt. When an agent gives a bad answer, was it the router's instruction, the sub-agent's instruction, the tool's description, or the tool's return format? The first month of any agent project is the team learning to answer that question quickly.

## Three rules I use now

I am not going to pretend I have a method. I have three rules that have survived three months of production, and I expect to revise them.

**One agent, one verb.** A sub-agent should do one thing you can name with a verb. Research. Write. Classify. Route. When I catch myself writing an instruction with "and also" in it, I split the agent. The Scout system my team runs has eight sub-agents under one root. Every one of them is a single verb. The root is the only one allowed to be a noun.

**Tools return facts, not prose.** A tool that returns a paragraph invites the model to paraphrase it and lose the number. A tool that returns a typed dict with the number in a named field survives the round trip. I learned this at Adspirer, where we translated natural language into executable SQL and validated the result against the schema before showing it. The same discipline applies here. Structure in, structure out, and the model narrates at the end.

**Every handoff writes to state.** When an agent hands off, it should write what it learned into session state under a named key before the next agent starts. Otherwise the next agent re-derives it from the transcript and sometimes gets it wrong. This is the boring rule. It is also the one that removed the most bugs.

## What I am watching

The whole field moved to agents this year. OpenAI put out GPT-5-Codex on September 15 as a coding agent built for long autonomous runs. Google's ADK is what I use every day. The frameworks disagree on names and agree on shape: a model, some tools, some children, some state.

I do not think chains are dead. The medical claims pipeline is a chain and will stay one. It has a fixed path and needs a fixed cost. I think the honest answer is that chains are for workflows you can draw, and agents are for conversations you cannot. Most enterprise systems need both, with the agent on the outside and chains as its tools.

Two years ago I could draw every system I built. Now I describe them and read what they did. That is the change. I am still deciding whether I like it.

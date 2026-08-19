---
title: "Sports match scheduling with reinforcement learning"
summary: "DQN and PPO agents in custom Gym environments that schedule multi-team tournaments under fairness, non-repetition and weekly balance constraints, scaled to thousands of games."
role: "Lead, team of 2"
org: "Data Insight, sports league client"
period: "Jun 2020 to Feb 2021"
stack: ["DQN", "PPO", "PyTorch", "OpenAI Gym", "NumPy", "PostgreSQL", "FastAPI", "Docker"]
order: 25
---

The constraints were the whole problem. Reward shaping encoded fairness and rest days. The agents produced schedules the league could not build by hand at that size. It taught me to write constraints before choosing a method, a lesson I still use in supply chain work.

---
title: "Real-time fraud detection pipeline"
summary: "Streaming features from Kafka transaction events, an ensemble of supervised and anomaly models, multi-model endpoints with A/B routing and alerting. Detects 94 percent of fraud at under 0.1 percent false positives."
role: "Lead, team of 3"
org: "Developers Inc, payments processor"
period: "Oct 2023 to Jul 2024"
stack: ["XGBoost", "Isolation Forest", "PyTorch", "Kafka", "AWS SageMaker", "Redshift", "AWS Lambda", "SNS", "Step Functions", "CloudWatch"]
order: 23
---

Features are computed on the stream, not in a batch. XGBoost, an isolation forest and an autoencoder score each transaction and the ensemble decides. The false positive rate is the number that mattered, because every false alarm is a blocked customer. The triage agent we built later sits on top of this.

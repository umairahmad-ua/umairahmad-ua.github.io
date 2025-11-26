---
title: "Medical claim automation"
summary: "Fine-tuned BERT for ICD-10, CPT and NPI extraction, a transformer inconsistency detector and a multi-payer rule engine serving more than 50,000 claims a day. Rejections fell 35 percent."
role: "Lead"
org: "Developers Inc, healthcare payer"
period: "2023 to 2025"
stack: ["BERT", "spaCy", "PyTorch", "FastAPI", "AWS Lambda", "DynamoDB", "Airflow"]
order: 6
---

Flagged claims go to reviewers. Corrections return as training data through active learning. Airflow retrains weekly. Two years on it still runs.

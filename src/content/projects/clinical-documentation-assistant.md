---
title: "Clinical documentation assistant for a hospital group"
summary: "Turns the recorded visit into a draft note in the clinician's own template. It never writes the diagnosis. Physicians report roughly forty minutes back per shift."
role: "Architect, team of 5"
org: "Zazmic, multi-site hospital group"
period: "Jan 2026 to present"
stack: ["Gemini 3 Pro", "Google ADK", "Whisper", "Vertex AI Agent Engine", "Firestore", "Cloud Run", "DLP API", "Presidio", "Pydantic", "Langfuse", "BigQuery", "Terraform", "GKE"]
order: 13
---

Audio is transcribed on the hospital's own infrastructure and de-identified before any model sees it. A drafting agent fills the history, exam and plan sections from the transcript. The diagnosis and orders fields stay empty by design. The clinician signs every note. Our eval set is built from notes physicians rewrote, so the score tracks what they actually changed.

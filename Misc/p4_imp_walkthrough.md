# Phase 4: Transformation & Validation Walkthrough

Phase 4 ensures that the "raw" data captured from the web is cleaned, normalized, and rigorously validated before it reaches the final client delivery stage.

## 💎 Core Components

### 1. High-Speed Normalization
To reduce LLM latency, we've implemented a programmatic normalization layer.
- **[Data Normalizer Utility](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/utils/data_normalizer.js)**: A JavaScript module that automatically:
  - Standardizes **Dates** to ISO-8601.
  - Strips **Currency Symbols** and casts prices to floats.
  - Converts **Units** (e.g., Lbs to Kgs) using hard-coded logic.

### 2. AI-Driven QA & Auditing
The **QA Agent** acts as the final gatekeeper for data integrity.
- **[QA Agent Prompt](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/qa_agent.txt)**: Evaluates the normalized data for "Reasonableness."
  - **Range Checks**: Detects invalid negative prices or impossible weights.
  - **Logical Proofs**: Ensures interdependent fields (like arrival vs. departure) make sense.
  - **Conflict Resolution**: If multiple sources provided the same data point, it resolves the conflict based on source authority.

---

## 🛠️ n8n Transformation Sub-workflow
- **File:** [n8n_transformation_workflow.json](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_transformation_workflow.json)
- **Workflow Highlights:**
  - **The Quality Gate:** Records with a `quality_score >= 0.8` are automatically converted to CSV and moved to Phase 5.
  - **HITL Routing:** Records with marginal scores are flagged to a dedicated Slack channel for Human-in-the-loop (HITL) review.
  - **Audit Traceability:** Every validated record includes an audit trail justifying its score and listing its verification sources.

---

## ⏭️ Next Step: Phase 5 (Delivery & Monitoring)
The final stage is to push the validated data to the client's destination (SFTP, API, or Cloud Bucket) and activate the **Sentinel** monitoring system for continuous SLA tracking.

Ready to complete the pipeline with Phase 5?

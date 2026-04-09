# Phase 4 Implementation Plan — Transformation & Validation

This plan details the implementation of **Phase 4: Transformation & Validation**. This phase ensures that the raw data captured in Phase 3 is normalized, logically consistent, and formatted according to client specifications.

## User Review Required

> [!IMPORTANT]
> **Triangulation Complexity:** If the framework extracts the same data point from multiple sources (e.g., price from two different travel sites), the **Conflict Resolver** needs a rule to decide which one to trust. My proposed default is "Highest Authority Wins," based on a pre-defined authority score in the `source_registry`.

> [!WARNING]
> **Data Integrity:** The QA Agent will assign a `quality_score`. If the score is below 0.8, the workflow will automatically flag the record for manual review instead of proceeding to delivery.

## Proposed Changes

### 1. n8n Transformation Sub-workflow Design
A specialized sub-workflow that processes the `raw_payload` from Phase 3.

| Step | Node Type | Action |
|---|---|---|
| **Entry** | `Execute Workflow Trigger` | Receives raw unstructured JSON from Phase 3. |
| **Normalize** | `AI Agent: Transformation` | Standardizes dates (ISO-8601), strips currency, and casts units. |
| **Logic Check** | `AI Agent: QA` | Performs range checks (e.g., Price > 0) and logical audits (e.g., Start Date < End Date). |
| **Triangulate** | `Code Node` | Resolves conflicts between multiple sources if applicable. |
| **Convert** | `Code Node` | Generates final output formats: CSV, JSON, or API Payload. |
| **Handoff** | `Execute Workflow` | Triggers Phase 5 (Delivery & Monitoring). |

---

### 2. File & Prompt Additions

#### [NEW] [Transformation Sub-workflow JSON](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_transformation_workflow.json)
- Create the JSON export for the Phase 4 sub-process.

#### [NEW] [Agent Prompts](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/)
- **Transformation Agent**: `transformation_agent.txt` (Normalization and formatting rules).
- **QA Agent**: `qa_agent.txt` (Validation, logic checks, and scoring).

#### [NEW] [Normalization Utility](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/utils/data_normalizer.js)
- A JavaScript snippet for high-speed date/unit normalization without needing LLM calls for every record.

---

## Open Questions

1. **Conflict Strategy:** Should we prefer the "First Source," "Last Source," or "Highest Authority" when data points conflict?
2. **QA Threshold:** What is the minimum `quality_score` (0.0 to 1.0) required for automated delivery?
3. **Multi-Record Handling:** If an extraction yields 1,000s of rows, should we perform QA on a *sample* or on *every individual record*?

## Verification Plan

### Automated Tests
- Pass "Malformed Data" (e.g., negative prices, invalid dates) through the QA node to verify rejection.
- Check that the `to_csv` converter produces a valid RFC 4180 file.

### Manual Verification
- Review the `quality_score` logs for a mock run and ensure that "suspicious" data was correctly flagged.

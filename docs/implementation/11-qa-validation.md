# Phase 4: QA & Validation Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Builds the Validation Agent. It acts as the final gatekeeper, grading the data on a confidence scale, performing triangulation across multiple sources, and enforcing logic checks.
- **Key design decisions and trade-offs:** High-confidence requirements (e.g., demanding 3 sources per claim) increase reliability but vastly increase the risk of failing the completion criteria if a niche topic lacks sources.
- **Prerequisites and outputs:**
  - *Prerequisites:* 10-transformation-mapping.md completed.
  - *Outputs:* `quality_scorer.py` and `triangulation_engine.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Constraint Logic and Range Checking
**Objective:** Detect hallucinated or impossible values.
**Prerequisites:** Standardized payload from Transformation engine.
**Artifacts to produce:**
- `agentic-research/agents/validation/quality_scorer.py`
**Instruction:**
> You are the Validation Agent. Write `quality_scorer.py`. Implement `check_logic(record)`. Ensure interdependent fields make sense (e.g., `Start Date` < `End Date`). Flag values that are out of basic bounds (e.g., Negative weight). Assign the record a base `quality_score` between 0.0 and 1.0.
**Acceptance criteria:**
- Script detects constraint conflicts and assigns numerical scores.

### Step 2: Triangulation and Conflict Resolution
**Objective:** Build consensus across multiple sources.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/validation/triangulation_engine.py`
**Instruction:**
> Write `triangulation_engine.py`. Combine identical claims from different sources. If Source A and Source B disagree, implement the conflict resolution strategy defined in the schema (e.g., `Highest Authority` wins, or `Inclusive Flagging` for manual review). Append a `verification_sources` list to the final verified claim.
**Acceptance criteria:**
- The engine successfully deduplicates and resolves source conflict according to weighted authority.

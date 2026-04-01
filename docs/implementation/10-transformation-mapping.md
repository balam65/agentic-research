# Phase 4: Transformation & Mapping Implementation

## Overview (Human Review)
- **What this phase accomplishes:** The Transformation Agent structures the raw, heterogeneous data points pulled by the Production node and formats them into strict schemas required by the internal database or final client system.
- **Key design decisions and trade-offs:** Decoupling Transformation from Extraction limits the extraction nodes' complexity, but adds an extra hop in the pipeline.
- **Prerequisites and outputs:**
  - *Prerequisites:* 09-production-scaling.md completed.
  - *Outputs:* `schema_mapper.py` and `format_converter.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Schema Normalization
**Objective:** Ensure variable names and units are consistent.
**Prerequisites:** Raw `extraction_data.json` payload.
**Artifacts to produce:**
- `agentic-research/agents/transformation/schema_mapper.py`
**Instruction:**
> You are the Transformation Agent. Write `schema_mapper.py`. Implement a function `normalize_record(record, target_schema)` that ensures dates conform to ISO-8601, numeric values cast to floats, and fields like `price` strip currency symbols into separate attributes. 
**Acceptance criteria:**
- Script applies hard typed rules to the dynamic JSON payload.

### Step 2: Format Output Handling
**Objective:** Prepare data for different destination systems.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/transformation/format_converter.py`
**Instruction:**
> Write `format_converter.py`. Implement export functions `to_csv()`, `to_json()`, and `to_client_api_payload()`. The outputs must be saved to the run's distinct directory as prepared files.
**Acceptance criteria:**
- Files are saved correctly based on the payload configuration.

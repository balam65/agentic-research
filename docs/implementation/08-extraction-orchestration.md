# Phase 3: Extraction & Orchestration Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Builds the Extraction/Orchestration Agent to manage the actual pulling of data. It Maps the `source_type` and `dom_selectors` (established in Phase 2) to the correct technical execution tool (e.g., headless browser, simple HTTP request, PDF reader).
- **Key design decisions and trade-offs:** Executing extraction centrally via this Orchestrator enables standardization of raw outputs. The trade-off is high peak CPU/Memory load if too many headless browsers spawn at once.
- **Prerequisites and outputs:**
  - *Prerequisites:* 07-scripting-repository.md completed.
  - *Outputs:* `orchestrator_node.py` and `extraction_adapters.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Tool Routing Logic
**Objective:** Map source requirements to extraction tools.
**Prerequisites:** Input `discovery_map` YAML available.
**Artifacts to produce:**
- `agentic-research/agents/extraction/orchestrator_node.py`
**Instruction:**
> You are the Orchestration Agent. Develop `orchestrator_node.py`. Create a function `route_extraction(source)` that evaluates the `source_type`. If "SPA", return the `BrowserAdapter`. If "Static HTML", return the `HTTPAdapter`. If "PDF", return the `PDFAdapter`. Account for `evasion_profile` requirements.
**Acceptance criteria:**
- Function correctly routes requests without failing on unknown types (fallback to basic HTTP).

### Step 2: Extraction Adapters 
**Objective:** Execute the extraction utilizing specific selectors.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/extraction/extraction_adapters.py`
**Instruction:**
> Write `extraction_adapters.py`. Implement class interfaces for `BrowserAdapter` and `HTTPAdapter`. They must accept a URL and `dom_selectors`. Use the selectors to isolate the data points and return a raw JSON payload mapping `topic` to `extracted_value`. 
**Acceptance criteria:**
- Adapters return a unified JSON payload irrespective of the underlying scraping method.

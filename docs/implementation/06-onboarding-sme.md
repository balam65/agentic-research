# Phase 2: Onboarding & SME Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Deploys the Onboarding and Subject Matter Expert (SME) Agents. They evaluate the technical feasibility of the `discovery_map` and resolve edge cases (e.g., bot detection blocks, complex UI interactions, stealth requirements).
- **Key design decisions and trade-offs:** This phase acts as a circuit breaker. If a source is impossible to scrape, the SME agent flags it here instead of allowing it to crash the Extraction nodes downstream.
- **Prerequisites and outputs:**
  - *Prerequisites:* 05-source-discovery.md completed.
  - *Outputs:* `feasibility_checker.py` and `evasion_config_manager.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Pre-flight Feasibility Analysis
**Objective:** Programmatically test if target domains are reachable without advanced stealth.
**Prerequisites:** `discovery_map` available.
**Artifacts to produce:**
- `agentic-research/agents/onboarding/feasibility_checker.py`
**Instruction:**
> You are the Onboarding Agent. Write `feasibility_checker.py` to ping the `deep_links`. Evaluate response headers (e.g., 403 Forbidden, Cloudflare traps). If clean, approve for basic Orchestration. If blocked, route to the SME function for exception handling.
**Acceptance criteria:**
- Script cleanly tags domains as `CLEAN` or `BLOCKED`.

### Step 2: Evasion Profile Assignment
**Objective:** Assign appropriate stealth configurations based on SME intelligence.
**Prerequisites:** Step 1 flagged domains.
**Artifacts to produce:**
- `agentic-research/agents/sme/evasion_config_manager.py`
**Instruction:**
> You are the SME Agent. Write `evasion_config_manager.py`. Map known `BLOCKED` responses to evasion strategies (e.g., "Rotate IP", "Use Headless Chrome with Stealth Plugin", "Simulate DOM Scroll"). Inject these requirements directly into the source's metadata within the `discovery_map` as `evasion_profile`.
**Acceptance criteria:**
- The `discovery_map` YAML is updated with clear `evasion_profile` parameters for the Extraction phase.

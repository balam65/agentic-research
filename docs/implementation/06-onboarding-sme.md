# Phase 2: Onboarding & SME Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Deploys the Onboarding and Subject Matter Expert (SME) Agents. They evaluate the technical feasibility of the `discovery_map`, maintain source/process knowledge, allocate technical resources, align extraction schedules, and resolve edge cases (e.g., bot detection blocks, complex UI interactions, stealth requirements).
- **Key design decisions and trade-offs:** This phase acts as a circuit breaker. If a source is impossible to scrape, the SME agent flags it here instead of allowing it to crash the Extraction nodes downstream.
- **Prerequisites and outputs:**
  - *Prerequisites:* 05-source-discovery.md completed.
  - *Outputs:* `feasibility_checker.py`, `evasion_config_manager.py`, `knowledge_repo_schema.yaml`, and `resource_deployment_plan.yaml`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Pre-flight Feasibility Analysis
**Objective:** Programmatically test if target domains are reachable without advanced stealth.
**Prerequisites:** `discovery_map` available.
**Artifacts to produce:**
- `agentic-research/agents/onboarding/feasibility_checker.py`
**Instruction:**
> You are the Onboarding Agent. Write `feasibility_checker.py` to ping the `deep_links`. Evaluate response headers (e.g., 403 Forbidden, Cloudflare traps). If clean, approve for basic Orchestration. If blocked, route to the SME function for exception handling. Record estimated effort, onboarding duration, and whether the source can proceed with existing assets or requires new scripting.
**Acceptance criteria:**
- Script cleanly tags domains as `CLEAN` or `BLOCKED`.
- Feasibility output includes effort and onboarding-time estimates for Master Agent tracking.

### Step 2: Evasion Profile Assignment
**Objective:** Assign appropriate stealth configurations based on SME intelligence.
**Prerequisites:** Step 1 flagged domains.
**Artifacts to produce:**
- `agentic-research/agents/sme/evasion_config_manager.py`
**Instruction:**
> You are the SME Agent. Write `evasion_config_manager.py`. Map known `BLOCKED` responses to evasion strategies (e.g., "Rotate IP", "Use Headless Chrome with Stealth Plugin", "Simulate DOM Scroll"). Inject these requirements directly into the source's metadata within the `discovery_map` as `evasion_profile`.
**Acceptance criteria:**
- The `discovery_map` YAML is updated with clear `evasion_profile` parameters for the Extraction phase.

### Step 3: Process Knowledge Repository Definition
**Objective:** Preserve source-by-source operational intelligence required for onboarding and support.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/onboarding/knowledge_repo_schema.yaml`
**Instruction:**
> Define `knowledge_repo_schema.yaml`. Capture per-source and per-client records containing extraction rules, required data attributes, validation criteria, anomalies, client requirements, specialized handling notes, and a marked pathway for Production, QA, Support, and SME agents.
**Acceptance criteria:**
- The schema supports source, client, anomaly, validation, and escalation metadata in one canonical record.

### Step 4: Resource Allocation, Deployment, and Schedule Alignment
**Objective:** Prepare the source for stable test and production onboarding.
**Prerequisites:** Steps 1-3 completed.
**Artifacts to produce:**
- `agentic-research/agents/onboarding/resource_deployment_plan.yaml`
**Instruction:**
> Create `resource_deployment_plan.yaml`. Document technical resource allocation for compute, storage, proxies, tools, test environments, and production environments. Include extraction schedule alignment checks against the expected data collection output from Assessment/Scheduling, plus phased status updates that must be sent back to the Master Agent during onboarding.
**Acceptance criteria:**
- The plan includes resource allocation, test/production deployment targets, extraction schedule alignment checks, and phased progress reporting requirements.

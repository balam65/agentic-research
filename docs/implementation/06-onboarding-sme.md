# Phase 2: Onboarding & SME Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Deploys the Onboarding and Subject Matter Expert (SME) Agents. They evaluate the technical feasibility of the `discovery_map`, maintain source/process knowledge, allocate technical resources, align extraction schedules, and resolve edge cases (e.g., bot detection blocks, complex UI interactions, stealth requirements).
- **Key design decisions and trade-offs:** This phase acts as a circuit breaker. If a source is impossible to scrape, the SME agent flags it here instead of allowing it to crash the Extraction nodes downstream.
- **Prerequisites and outputs:**
  - *Prerequisites:* 05-source-discovery.md completed.
  - *Outputs:* `feasibility_checker.py`, `evasion_config_manager.py`, `knowledge_repo_schema.yaml`, and `resource_deployment_plan.yaml`.

## Step-by-Step Instructions (Agent Consumption)

### Step 0: Analysis Bridge Ingestion
**Objective:** Load the `target-pipeline-config.yaml` produced by the Research Analysis Framework into the live agent ecosystem before any onboarding steps begin.
**Prerequisites:** `08-research-onboarding-bridge.md` completed; `target-pipeline-config.yaml` available in the Master Orchestrator's target registry.
**Artifacts to produce:**
- `agentic-research/agents/onboarding/config_ingestion.py`
**Instruction:**
> You are the Onboarding Agent. Write `config_ingestion.py`. Read the `target-pipeline-config.yaml` for the active `job_id` from the target registry. Map each config field to its destination: inject `extraction_engine` and `known_defenses` into the scripting agent context, `proxy_tier_required` and `rate_limit_per_min` into the production agent context, and `alerting_thresholds` into the sentinel baseline configuration. Log the ingestion event to `audit_logs` with `job_id`, `target_domain`, and `timestamp`.
**Acceptance criteria:**
- All `target-pipeline-config.yaml` fields are distributed to their respective agent contexts without manual intervention.
- Ingestion event is recorded in `audit_logs` with `job_id`, `target_domain`, and `timestamp`.
- If the YAML is missing or malformed, the SME Agent must emit a `CONFIG_INGESTION_ERROR` and halt the job before proceeding to Step 1.

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
**Objective:** Prepare the source for stable test and production onboarding — including a mandatory budget gate check before any compute or proxy resources are provisioned.
**Prerequisites:** Steps 1–3 completed; `target-pipeline-config.yaml` ingested (Step 0); `daily_cost_estimate` available from `07-operational-readiness-assessment.md` in the target registry.
**Artifacts to produce:**
- `agentic-research/agents/onboarding/resource_deployment_plan.yaml`
**Instruction:**
> Before finalising `resource_deployment_plan.yaml`, perform a **Budget Gate Check**: read the `daily_cost_estimate` (total pipeline weight in $/day) for this target from the `target_registry` (populated from `07-operational-readiness-assessment.md`). Compare it against the client's contracted billing tier stored in `job_runs`. If the estimate exceeds the client's margin floor, emit a `BUDGET_HOLD` signal to the Master Agent and pause deployment — do not create the resource plan until a human HITL operator explicitly approves the spend. If the budget clears, proceed to create `resource_deployment_plan.yaml`: document compute, storage, proxy, and tool allocation for test and production environments. Include extraction schedule alignment checks against the Assessment/Scheduling output, plus phased status updates back to the Master Agent during onboarding.
**Acceptance criteria:**
- `daily_cost_estimate` is retrieved from the target registry before any resources are provisioned.
- A `BUDGET_HOLD` signal is emitted and deployment paused if cost exceeds the client margin floor.
- Human HITL approval is recorded in `audit_logs` before the plan proceeds past a hold.
- The final plan includes resource allocation, test/production deployment targets, schedule alignment checks, and phased progress reporting requirements.

# Phase 0: Master Orchestration & Framework Setup

## Overview (Human Review)
- **What this phase accomplishes:** Initializes the foundational infrastructure for the entire agentic-research data production workflow. It deploys the Master Agent, which serves as the central orchestration layer, routing tasks and enforcing pipeline cadence.
- **Key design decisions and trade-offs:** The Master Agent focuses strictly on coordination, logging, and state management rather than executing research tasks. This ensures loose coupling but introduces a single point of failure if the orchestrator goes down. 
- **Prerequisites and outputs:** 
  - *Prerequisites:* None. Base environment setup.
  - *Outputs:* The initialized workflow repository, the Master Agent configuration file (`master-config.yaml`), and the persistent state database for tracking agent handoffs.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Initialize Workspace and Orchestration State
**Objective:** Establish the directory structure and state management schema.
**Prerequisites:** Shell access to the deployment environment.
**Artifacts to produce:**
- `agentic-research/orchestration/state_schema.sql`
- `agentic-research/orchestration/master-config.yaml`
**Instruction:**
> You are the Setup Agent. Create the base directory structure for the pipeline. Write `master-config.yaml` to define the 14-agent sequence. Then, write `state_schema.sql` using Postgres dialect defining tables for `job_runs`, `active_agents`, and `handoff_logs` where each job run requires an `intent_hash` and `status` ENUM (PENDING, ACTIVE, FAILED, COMPLETED).
**Acceptance criteria:**
- The schema file contains the required tables and ENUMs.
- `master-config.yaml` maps the sequence from Assessment through Support.

### Step 2: Deploy Master Agent Core Loop
**Objective:** Create the main control loop for the Master Agent.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/master/core_loop.py`
**Instruction:**
> Develop the `core_loop.py` script for the Master Agent. Implement an event-driven loop that pulls the `status` of jobs from the state database. If a job is marked 'ASSESSMENT_COMPLETE', the Master Agent must emit an event to trigger the 'DISCOVERY' and 'ONBOARDING' agents. Ensure comprehensive logging of task duration.
**Acceptance criteria:**
- Python script executes without syntax errors.
- Logging captures state transitions accurately.

### Step 3: Initialize Target Registry
**Objective:** Define the canonical Target Registry — the single source of truth that synchronizes per-target configuration data across the Scripting, Onboarding, and Sentinel agents, eliminating the duplicate-store problem between `script_catalog_db` and `knowledge_repo_schema.yaml`.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/orchestration/target_registry_schema.sql`
**Instruction:**
> Write `target_registry_schema.sql`. Define a `target_registry` table in Postgres that serves as the authoritative record for every onboarded extraction target. The schema must include: `target_id` (UUID PK), `domain` (text, unique), `pipeline_config` (JSONB — stores the full `target-pipeline-config.yaml` fields), `script_catalog_ref` (FK → `scripts.id`), `knowledge_repo_ref` (FK → `knowledge_repo_schema` record), `readiness_score` (numeric 1–5), `daily_cost_estimate` (numeric), `status` (ENUM: PENDING, ACTIVE, DEPRECATED), and `last_synced_at` (timestamp). Extend `state_schema.sql` with a FK from `job_runs.target_id` → `target_registry.target_id`. Document the sync rule: whenever `script_catalog_db` or `knowledge_repo_schema.yaml` is updated for a target, `target_registry.last_synced_at` must be refreshed and `pipeline_config` reconciled.
**Acceptance criteria:**
- Valid Postgres SQL schema with all specified columns and constraints.
- FK relationships from `job_runs` to `target_registry` are enforced.
- Schema comments document the sync rule for `script_catalog_db` and `knowledge_repo_schema.yaml`.

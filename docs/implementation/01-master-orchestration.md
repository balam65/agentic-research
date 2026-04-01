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

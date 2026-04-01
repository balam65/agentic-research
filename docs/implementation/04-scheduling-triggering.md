# Phase 1: Scheduling & Triggering Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Builds the Scheduling Agent responsible for queueing the `research_brief` payloads against SLA priorities and resource availability, dispatching them to the Onboarding Phase.
- **Key design decisions and trade-offs:** Decoupling scheduling from Master Orchestration ensures complex SLA math and cron-job execution doesn't block the Master loop.
- **Prerequisites and outputs:**
  - *Prerequisites:* 03-assessment-interrogation.md completed.
  - *Outputs:* `queue_manager.py` and `dispatch_trigger.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: SLA and Priority Queue Design
**Objective:** Define the queueing mechanism for research jobs.
**Prerequisites:** Database schema from Phase 0.
**Artifacts to produce:**
- `agentic-research/agents/scheduling/queue_manager.py`
**Instruction:**
> Implement `queue_manager.py`. Create logic to ingest a newly created `research_brief`. Assign an SLA threshold based on the `user_intent` field (e.g., 'Crisis Analysis' = 1 hour, 'Market Overview' = 24 hours). Insert the job into the Master Agent's `job_runs` table with the calculated priority score.
**Acceptance criteria:**
- Priority logic successfully differentiates time-sensitive tasks.
- Database insert executes properly.

### Step 2: Dispatch Trigger System
**Objective:** Trigger downstream agents when resources allow.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/scheduling/dispatch_trigger.py`
**Instruction:**
> Build a chron-based dispatcher. Check the `active_agents` table. If the Discovery/Onboarding node has capacity, pop the highest priority job from `job_runs` and emit a webhook or event to initiate Phase 2 for that job. Update job `status` to 'ACTIVE'.
**Acceptance criteria:**
- Dispatcher respects concurrent capacity limits.
- Status cleanly updates to ACTIVE.

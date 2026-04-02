# Phase 5: Sentinel & Monitoring Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Deploys the Sentinel Monitoring Agent. Operating continuously alongside Phase 3-5, this agent tracks extraction latency, queue health, delivery completion, failure spikes, machine allocation drift, and capacity bottlenecks to ensure SLAs are held and system outages are reported instantly.
- **Key design decisions and trade-offs:** An autonomous sentinel replaces generic cron-based alarms with heuristic intelligence—allowing the system to distinguish between a "slow site" and a "broken orchestrator node" dynamically.
- **Prerequisites and outputs:**
  - *Prerequisites:* 09-production-scaling.md completed.
  - *Outputs:* `latency_tracker.py` and `system_alarms.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Job Latency Monitoring
**Objective:** Detect jobs that are stalling or failing silently.
**Prerequisites:** Access to Master DB.
**Artifacts to produce:**
- `agentic-research/agents/sentinel/latency_tracker.py`
**Instruction:**
> You are the Sentinel Agent. Develop `latency_tracker.py`. Query the `job_runs` table every 60 seconds. Calculate the duration of any job in the 'ACTIVE' state against its calculated 'SLA' threshold from Phase 1. Confirm that queues and inputs have been generated and allocated properly in the scheduling environment. If a job exceeds 80% SLA elapsed time without completion, emit an alert payload. Include database-latency observations when scheduler or state reads become slow.
**Acceptance criteria:**
- Function accurately identifies threshold breaches.
- Queue-allocation issues and DB latency symptoms are also surfaced.

### Step 2: Outage & Alarm Dispatch
**Objective:** Route specific errors to human operators.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/sentinel/system_alarms.py`
**Instruction:**
> Write `system_alarms.py`. Subscribe to the alert payloads from the Latency Tracker and Production failure queues. Push critical infrastructure warnings to the DevOps Slack channel and business-logic failures to the Operational Dashboards. Maintain daily delivery summaries for each process, send usage logs to the Master Agent for monthly call-count and billing reconciliation, and when schedules fail due to latency, blocking, or script issues, emit re-allocation instructions to move inputs onto appropriate machines.
**Acceptance criteria:**
- Subscriptions function correctly and messages format appropriately for Slack/PagerDuty.
- Daily summaries, billing-log forwarding, and machine re-allocation actions are defined.

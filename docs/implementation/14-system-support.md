# Phase 5: System Support & Helpdesk Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Establishes the Support Agent, an intelligent frontline layer for both internal pipeline failures (escalated from Sentinel/SME) and external client inquiries about delivery delays or data formats.
- **Key design decisions and trade-offs:** Providing direct user and client access to a Support Agent reduces operational ticket volume; however, the agent must be heavily sandboxed to ensure it cannot manipulate the state of active research runs directly. It must also preserve case history and support process-quality adherence.
- **Prerequisites and outputs:**
  - *Prerequisites:* 12-delivery-pipelines.md and 13-sentinel-monitoring.md completed.
  - *Outputs:* `inquiry_router.py` and `issue_resolution.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Inquiry Receiver and Router
**Objective:** Capture issues across channels and classify them safely.
**Prerequisites:** Basic API gateway.
**Artifacts to produce:**
- `agentic-research/agents/support/inquiry_router.py`
**Instruction:**
> You are the Support Agent. Write `inquiry_router.py`. Build endpoints to ingest support requests (Internal API, Client Email wrapper). Use an LLM classification step to categorize the request as either a "System Outage", "Data Quality Dispute", or "Delivery Status Check".
**Acceptance criteria:**
- Script parses strings correctly and assigns classification categories.

### Step 2: Resolution & Escalation Routing
**Objective:** Automatically respond to basic queries or generate high-priority manual tickets.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/support/issue_resolution.py`
**Instruction:**
> Develop `issue_resolution.py`. For "Delivery Status Checks", query the Master DB and automatically reply with the job status. For "Data Quality Disputes", escalate the ticket by creating an issue in JIRA (or equivalent) for the QA and SME teams. Let the requester know the ticket ID. Persist support-case records for reference/reporting and capture service-quality/process-adherence tags on each case.
**Acceptance criteria:**
- Status checks execute read-only queries. Escaplation hooks securely format JIRA-style tickets.
- Case records and service-quality tags are stored for later reporting.

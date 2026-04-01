# Phase 3: Production & Scaling Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Implements the Production Agent, which handles the operational realities of the extraction workloads: dynamic scaling of compute nodes, proxy rotation, and retry logic.
- **Key design decisions and trade-offs:** Distributing the scrape jobs across multiple cloud nodes speeds up delivery but requires robust distributed locking to prevent duplicate extracts. 
- **Prerequisites and outputs:**
  - *Prerequisites:* 08-extraction-orchestration.md completed.
  - *Outputs:* `proxy_rotator.py` and `scale_manager.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Proxy and Identity Rotation
**Objective:** Prevent IP blocking during high-volume node runs.
**Prerequisites:** `vault_manager.py` from Phase 0.
**Artifacts to produce:**
- `agentic-research/agents/production/proxy_rotator.py`
**Instruction:**
> You are the Production Agent. Write `proxy_rotator.py`. Integrate with the Compliance Agent's leased credentials. Implement a method `get_next_proxy(domain)` that rotates IP addresses and user agents, ensuring no single IP requests the same domain more than establishing rate-limits allow (e.g., 5 req/min). 
**Acceptance criteria:**
- Script safely returns masked proxy strings and increments usage counters.

### Step 2: Retry and Backoff Logic
**Objective:** Handle intermittent extraction failures gracefully.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/production/scale_manager.py`
**Instruction:**
> Write `scale_manager.py`. Wrap the Execution Adapter calls from Step 08 with a "Three-Strike" rule. If an extraction fails due to timeout or 503, apply an exponential backoff. If it fails 3 times, log the `error_code` and route the item to `missing_areas` in the payload for SME review.
**Acceptance criteria:**
- Retry loop functions correctly. Logs reflect backoff durations.

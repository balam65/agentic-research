# Evaluation Plan: Agentic Data Production Pipeline

## 1. Baseline Definition
- **Current throughput:** 0 automated end-to-end runs.
- **Current vendor/manual cost:** High manual overhead, fragile scripting.
- **Extraction tool reliability:** N/A (Currently Unbuilt).

## 2. Primary Outcome Metrics
- **End-to-End Success Rate (%):** The percentage of requirement briefs that result in a successfully delivered dataset (Target: > 95%).
- **SLA Compliance Rate (%):** Percentage of payloads delivered within the designated timeframe.

## 3. Leading Indicators (Phase 3 Specific)
- **Proxy Health Score:** Exhaustion rate or IP-ban rate per 1,000 requests (Target: < 2%).
- **Extraction Adapter Latency:** Time spent per URL scrape (Browser vs HTTP).
- **Node Resource Utilization:** CPU/Memory usage spikes when deploying `BrowserAdapter`.
- **Retry Count per Job:** Average number of strikes before success.

## 4. Review Cadence & Go/No-Go Gates
- **Dry-Run Gate (Post-Immediate Horizon):** 
  - Execute a batch of 50 known jobs. 
  - *Go metric:* Unified JSON is produced for all 50 without crashing the orchestrator node.
- **Production Shadowing (Post-Soon Horizon):**
  - Run a subset of live traffic parallel to existing manual procedures.
  - *Go metric:* Data matches quality of manual extracts and passes Phase 4 QA validation rules.
- **Ongoing Review:** Bi-weekly Sentinel Monitor review to check queue allocation and SLA breaches.

## 5. Failure Signals (Triggers for Redesign)
- **Signal 1:** `BrowserAdapter` headless instances causing nodes to OOM (Out of Memory) crash consistently. *(Requires moving to serverless cloud functions or scaling nodes faster).*
- **Signal 2:** Proxy rotation fails to evade basic anti-bot logic on > 10% of jobs. *(Requires deeper SME Agent evasion configs or upgraded proxy providers).*
- **Signal 3:** Duplicate extractions due to locking failures during scaling. *(Requires rewriting `scale_manager.py` state locks).*

# Phase 2: Deep Research & Onboarding Walkthrough

Phase 2 is now fully implemented as a modular n8n sub-workflow. This phase transforms a abstract research brief into a concrete, executable extraction script and evasion profile.

## 🚀 Key Features

### 1. Conditional Fast-Tracking (Efficiency)
Before launching expensive AI research, the workflow now performs a check against the `source_registry`.
- **Known Sources:** If a domain is already in the database with an active script, the workflow "Fast-Tracks" directly to Phase 3 (Production).
- **Unknown Sources:** Triggers the full research sequence only when necessary.

### 2. Multi-Agent Reconnaissance
We've deployed three specialized agents to handle the complexity of new targets:
- **[Discovery Agent](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/discovery_agent.txt)**: Responsible for mapping deep links and identifying hidden API endpoints.
- **[SME & Onboarding Agent](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/sme_agent.txt)**: Tests for bot detection (Cloudflare, Akamai) and assigns an `evasion_profile` (Proxies, Stealth headers).
- **[Scripting Agent](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/scripting_agent.txt)**: Automatically generates CSS/XPath selectors from HTML snippets using an LLM.

### 3. Automated Script Repository
- **File:** [state_management.sql](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/state_management.sql)
- **Updates:** The database now stores CSS selectors, version numbers, and the operational status of every discovered script.

---

## 🛠️ n8n Sub-workflow
- **File:** [n8n_discovery_workflow.json](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_discovery_workflow.json)
- **Logic Flow:**
  - **Execute Workflow Trigger** → **Postgres Library Check** → **Branch: Fast-Track or Research**
  - **Research Path:** Discovery → SME Profiling → Script Generation → Postgres Upsert
  - **Final Output:** Hands off the job ID and extraction config to Phase 3.

---

## ⏭️ Next Step: Phase 3 (Production & Scaling)
The final step is to build the **Production & Data Capture** workflow, which will use the selectors and evasion profiles generated here to execute the mass extraction.

Ready to start on Phase 3?

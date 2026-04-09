# Phase 3 Implementation Plan — Production & Data Capture

This plan details the implementation of **Phase 3: Production & Data Capture**. This is the high-performance "Engine Room" of the framework, responsible for executing mass extraction while managing proxy health and resource scaling.

## User Review Required

> [!IMPORTANT]
> **Extraction Tooling in n8n:** To handle "SPA" (Single Page Application) sites, we will need a headless browser integration. I propose using the **n8n Browser nodes** (Playwright/Puppeteer) if available, or an external API like Browserless.io / ScrapingBee.

> [!WARNING]
> **Distributed Locking:** To prevent duplicate extractions when scaling across multiple nodes, we will use a "LEASING" mechanism in the `job_runs` table to mark items as `EXTRACTION_ACTIVE`.

## Proposed Changes

### 1. n8n Production Sub-workflow Design
We will build a high-concurrency workflow that processes the outputs from Phase 2.

| Step | Node Type | Action |
|---|---|---|
| **Entry** | `Execute Workflow Trigger` | Receives target URLs, selectors, and evasion profiles. |
| **Proxy Fetch** | `PostgreSQL / Cache` | Retrieves the next safe IP and User-Agent from the rotation pool. |
| **Router** | `Switch` | Diverts to `HTTP Request` (Static) or `Browser` (SPA/Dynamic). |
| **Extraction** | `AI Agent: Extraction` | Applies CSS/XPath selectors to the live DOM/HTML. |
| **Retry Loop** | `Wait` + `If` | Exponential backoff logic for 403/503 errors (3-strike rule). |
| **Storage** | `PostgreSQL: Log Run` | Updates `sentinel_logs` with latency and success metrics. |

---

### 2. File & Prompt Additions

#### [NEW] [Production Sub-workflow JSON](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_production_workflow.json)
- Create the JSON export for the Phase 3 sub-process.

#### [NEW] [Agent Prompts](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/)
- **Extraction Agent**: `extraction_agent.txt` (Tool routing and data isolation).
- **Production Agent**: `production_agent.txt` (Proxy rotation and retry orchestration).

#### [NEW] [Proxy Utility](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/utils/proxy_handler.js)
- A reusable JavaScript snippet for n8n Code nodes to calculate the next proxy and rotate User-Agents.

---

## Open Questions

1. **Headless Browser Provider:** Do you have a preferred headless browser service (e.g., Browserless, ScrapingBee, or a local Playwright docker)?
2. **Proxy Management:** Should we use an external proxy provider's rotation (sticky sessions) or implement manual rotation logic within n8n?
3. **Storage Format:** Should the raw unstructured payload be stored as a `JSONB` column in the DB, or as a temporary `.json` file in a staging bucket (S3/GCS)?

## Verification Plan

### Automated Tests
- Simulate a 503 error to verify the exponential backoff retry loop.
- Validate that different `evasion_profiles` result in different header/proxy combinations.

### Manual Verification
- Run an extraction against a test site (e.g., a mock travel site) and verify that the `raw_payload` matches the expected schema.

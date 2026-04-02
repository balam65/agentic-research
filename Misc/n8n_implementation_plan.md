# n8n Workflow Architecture — Agentic Research Framework

This plan outlines the steps to translate the **Agentic Research Framework (Phases 0-5)** into a production-ready **n8n workflow ecosystem**. We will move from conceptual documentation to executable nodes that orchestrate the 14 agents defined in the master plan.

## User Review Required

> [!IMPORTANT]
> **Orchestration Strategy:** I propose a **Hub-and-Spoke** model. A single "Master Orchestrator" workflow will manage the state and trigger "Sub-workflows" for each phase. This ensures scalability and easier debugging of individual agent logic.

> [!WARNING]
> **State Persistence:** The workflow requires a PostgreSQL or Supabase instance to track job statuses (`PENDING`, `ACTIVE`, `FAILED`, `COMPLETED`). We need to confirm if you have an existing database or if I should set up a local Docker-based PostgreSQL for testing.

## Proposed Changes

### 1. Workflow Design & Node Mapping
We will map the 14 agents to specific n8n node types.

| Phase | Agent Role | n8n Node Type | Key Responsibility |
|---|---|---|---|
| **P0** | Master Orchestrator | `AI Agent` + `PostgreSQL` | Manages state, routes to sub-workflows. |
| **P1** | Assessment | `Webhook` + `AI Agent` | Intent ingestion, brief generation. |
| **P1** | Scheduling | `Schedule` + `Wait` | Managing recursion and SLA triggers. |
| **P2** | Discovery | `HTTP Request` + `AI Agent` | Web search, specialist deep linking. |
| **P3** | Extraction | `Code` + `HTTP Request` | Executing scraping scripts / cloud scaling. |
| **P4** | QA & Validation | `AI Agent` | Schema checks, confidence scoring. |
| **P5** | Delivery | `SFTP` / `Slack` / `API` | Data push and status alerts. |

---

### 2. Implementation Steps

#### [NEW] [n8n Master Orchestrator JSON](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_master_workflow.json)
- Create a template JSON for the main workflow including:
  - **Webhook Trigger**: For manual or external starts.
  - **AI Agent Node**: Configured as the "Master Agent" with access to the Phase documents as context.
  - **Execute Workflow Nodes**: To trigger specific "Phase" sub-workflows.

#### [NEW] [State Schema SQL](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/state_management.sql)
- Implement line 16-17 of `01-master-orchestration.md`.
- Tables: `job_runs`, `agent_handoffs`, `source_registry`.

#### [NEW] [Agent Prompt Templates](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/)
- Extract the "Agent Consumption" instructions from the Phase docs and format them as System Prompts for n8n AI Agent nodes.

## Open Questions

1. **Database Access:** Do you have a Supabase/PostgreSQL URL ready, or should I generate the schema for a local setup first?
2. **LLM Provider:** Which AI model should the n8n agents use? (e.g., OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, or Gemini 1.5 Pro via n8n's Gemini node).
3. **Connectivity:** Will the n8n instance be hosted (e.g., n8n Cloud) or local? This affects how it reaches internal files/scripts.

## Verification Plan

### Automated Tests
- Run the `state_management.sql` against a test DB.
- Validate the n8n JSON schema for syntax errors.

### Manual Verification
- Import the JSON into n8n and verify the node connections.
- Test a "Mock Research Request" via Webhook and trace it through the first 3 phases.

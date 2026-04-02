# n8n Orchestration Scaffolding Walkthrough

We have successfully transitioned the **Agentic Research Framework** from high-level documentation to a concrete **n8n Orchestration Layer**. This setup provides the infrastructure to automate the 14-agent research pipeline.

## 🏗️ Components Implemented

### 1. Persistent State Management
We've established the database schema required for Phase 0 (Orchestration & Governance).
- **File:** [state_management.sql](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/state_management.sql)
- **Features:** 
  - `job_runs`: Tracks job status (PENDING, ACTIVE, etc.) and stores the `research_brief`.
  - `agent_handoffs`: Audit trail for agent-to-agent communication.
  - `source_registry`: Metadata for discovered domains and defense complexity.

### 2. Core Agent Prompts (Phase 0-1)
Extracted the specialized logic from the phase documents into n8n-ready system prompts.
- **Master Agent ([master_agent.txt](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/master_agent.txt))**: Manages the sequence and state transitions.
- **Assessment Agent ([assessment_agent.txt](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/assessment_agent.txt))**: Handles intent parsing and YAML brief generation.

### 3. n8n Master Workflow Blueprint
A modular JSON template for the central control hub.
- **File:** [n8n_master_workflow.json](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_master_workflow.json)
- **Workflow Highlights:**
  - **Ingestion**: Accepts POST requests via Webhook.
  - **AI Intelligence**: Routes the payload through the Assessment Agent.
  - **HITL Gate**: Automatically flags low-confidence requests to Slack if the AI is unsure of the intent.

---

## ⏭️ Next Steps

1. **Deploy Schema**: Run [state_management.sql](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/state_management.sql) against your PostgreSQL/Supabase instance.
2. **Import Workflow**: Import the [n8n_master_workflow.json](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_master_workflow.json) into your n8n instance.
3. **Phase 2 Sub-workflows**: We can now begin scaffolding the **Discovery** and **Extraction** sub-workflows to complete the "Spoke" part of the architecture.

> [!TIP]
> To test the "Master Orchestrator," you can send a mock POST request to the Webhook URL once imported:
> ```json
> {
>   "intent": "Research baggage fees for Delta Airlines",
>   "client_id": "client_99"
> }
> ```

# Phase 5 Implementation Plan — Delivery, Support & Monitoring

This plan completes the **Agentic Research Framework** by implementing the final delivery pipelines, the Sentinel monitoring system, and the automated Support Agent. This phase ensures data reaches the client securely and the system remains healthy.

## User Review Required

> [!IMPORTANT]
> **Delivery Security:** According to `12-delivery-pipelines.md`, we need to implement ZIP compression and Encryption. I will provide a JavaScript utility for n8n to handle basic ZIP packaging, but PGP/Public Key encryption will require an external tool or specific n8n crypto-extension.

> [!WARNING]
> **SLA Monitoring:** The Sentinel Agent will query the database every 60 seconds. We need to ensure that the `SLA` thresholds (in minutes/hours) are defined in the `research_brief` during Phase 1 for this to function correctly.

## Proposed Changes

### 1. n8n Delivery & Monitoring Sub-workflow
This workflow handles the "Last Mile" of the data production process.

| Step | Node Type | Action |
|---|---|---|
| **Packaging** | `Code Node` | Compresses the validated CSV/JSON into a ZIP archive. |
| **Delivery** | `SFTP / HTTP / S3` | Pushes the archive to the configured client destination. |
| **Status Update** | `PostgreSQL` | Marks the `job_runs` as `COMPLETED`. |
| **Monitoring** | `Schedule + Postgres` | (Sentinel) Periodically checks for stalled jobs (ACTIVE > SLA). |
| **Alerting** | `Slack / PagerDuty` | Dispatches critical infrastructure or SLA warnings. |
| **Support** | `Webhook + AI Agent` | Handles incoming status checks or data quality disputes. |

---

### 2. File & Prompt Additions

#### [NEW] [Delivery Sub-workflow JSON](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/n8n_delivery_workflow.json)
- Create the JSON export for the Phase 5 sub-process.

#### [NEW] [Agent Prompts](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/prompts/)
- **Delivery Agent**: `delivery_agent.txt` (Packaging rules and SFTP/API protocols).
- **Sentinel Agent**: `sentinel_agent.txt` (Threshold calculations and escalation logic).
- **Support Agent**: `support_agent.txt` (Inquiry classification and Jira integration).

#### [NEW] [Export Utility](file:///Users/balasubramanianmahadevan/Documents/agentic-research/orchestration/utils/export_packager.js)
- A JavaScript snippet for ZIP compression and metadata attachment.

---

## Open Questions

1. **Bucket/SFTP Credentials:** For the delivery node, should I use placeholders, or do you have specific environment variables I should reference?
2. **Support Channels:** Which channels should the Support Agent listen to? (e.g., Slack Webhook, Email, or an Internal API endpoint).
3. **Encryption Complexity:** Do you require PGP encryption for the delivery, or is standard SFTP/HTTPS transport security sufficient for the MVP?

## Verification Plan

### Automated Tests
- Trigger a mock delivery to a test S3 bucket/SFTP server.
- Simulate a stalled job in the database and verify that the Sentinel Agent correctly alerts Slack.

### Manual Verification
- Send a "Status Check" inquiry to the Support Webhook and verify that the Agent replies with the correct job status from the database.

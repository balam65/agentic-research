# Phase 0: Compliance & Security Initialization

## Overview (Human Review)
- **What this phase accomplishes:** Sets up the Compliance Agent which guards sensitive data, injects PI/PII masks, ensures all API tokens/cloud credentials are vaulted and only temporarily leased to active agents, and supports ongoing compliance awareness across the workflow.
- **Key design decisions and trade-offs:** We employ a strict "default-deny" permissions model. Only specific agents (like the Extraction Agent) receive credentials, and only at runtime. This maximizes security but requires rigorous credential management.
- **Prerequisites and outputs:**
  - *Prerequisites:* 01-master-orchestration.md completed.
  - *Outputs:* `vault_manager.py` and `compliance_audit_rules.yaml`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Establish Secret Vault Integration
**Objective:** Create the utility the Compliance Agent uses to provision temporary credentials.
**Prerequisites:** Master state database initialized.
**Artifacts to produce:**
- `agentic-research/agents/compliance/vault_manager.py`
**Instruction:**
> You are the Security Implementation Agent. Write `vault_manager.py` to interface with the system's Secret Manager (e.g., AWS Secrets Manager or HashiCorp Vault). Implement a function `lease_credential(agent_id, target_domain)` that returns a temporary, scoped API token or proxy credential explicitly for the requested domain. Log every lease request.
**Acceptance criteria:**
- Script exposes `lease_credential`.
- Logs include `agent_id` and timestamp without exposing the secret itself.

### Step 2: Define Data Masking Policies
**Objective:** Define the rules for the Compliance Agent to scan leaving payloads for exposed credentials or PII — beginning with target-specific rules inherited from the analysis framework before adding system-wide standards.
**Prerequisites:** Step 1 completed; `target-pipeline-config.yaml` available in the target registry (populated by `config_ingestion.py` in 06-onboarding-sme.md Step 0).
**Artifacts to produce:**
- `agentic-research/agents/compliance/compliance_audit_rules.yaml`
**Instruction:**
> Generate `compliance_audit_rules.yaml` in two passes. **Pass 1 (Target-Specific):** Read the active `target-pipeline-config.yaml` from the target registry. Check the `compliance.masking_enabled` flag and load any target-specific PII exposure warnings sourced from `06-compliance-delivery-analysis.md` (e.g., GDPR/CCPA passenger data, PCI-DSS card fields). Pre-populate the YAML with per-target masking entries and the `robots_txt_waiver` status. **Pass 2 (System-Wide):** Append the standard system-wide regex patterns for API keys, AWS keys, credit card numbers, and email addresses. Set the action for all rules to strictly `MASK_AND_FLAG` before the payload reaches the Delivery Agent.
**Acceptance criteria:**
- YAML includes both target-specific masking entries (from analysis config) and system-wide standard patterns.
- `robots_txt_waiver` status is recorded per target.
- Action for all rules is explicitly set to `MASK_AND_FLAG`.
- If `compliance.masking_enabled` is false for a target, the Compliance Agent must log a `COMPLIANCE_OVERRIDE` warning before proceeding.

### Step 3: Compliance Awareness and Review Loop
**Objective:** Preserve non-technical compliance responsibilities required by the operating model.
**Prerequisites:** Steps 1-2 completed.
**Artifacts to produce:**
- `agentic-research/agents/compliance/compliance_enablement_policy.yaml`
**Instruction:**
> Define `compliance_enablement_policy.yaml`. Document recurring review requirements for processes and documentation, plus the training and awareness responsibilities the Compliance Agent must support so downstream teams remain aligned with data-handling policy.
**Acceptance criteria:**
- The policy includes documentation review expectations and compliance-awareness responsibilities.

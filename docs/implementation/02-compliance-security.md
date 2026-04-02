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
**Objective:** Define the rules for the Compliance Agent to scan leaving payloads for exposed credentials or PII.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/compliance/compliance_audit_rules.yaml`
**Instruction:**
> Generate the `compliance_audit_rules.yaml` file. Define exact regex patterns for API keys, AWS keys, credit cards, and email addresses. Configure the Compliance Agent's action when a match is found to strictly "MASK_AND_FLAG" before allowing the payload to pass to the Delivery Agent.
**Acceptance criteria:**
- YAML contains standard regex keys.
- Action explicitly set to MASK_AND_FLAG.

### Step 3: Compliance Awareness and Review Loop
**Objective:** Preserve non-technical compliance responsibilities required by the operating model.
**Prerequisites:** Steps 1-2 completed.
**Artifacts to produce:**
- `agentic-research/agents/compliance/compliance_enablement_policy.yaml`
**Instruction:**
> Define `compliance_enablement_policy.yaml`. Document recurring review requirements for processes and documentation, plus the training and awareness responsibilities the Compliance Agent must support so downstream teams remain aligned with data-handling policy.
**Acceptance criteria:**
- The policy includes documentation review expectations and compliance-awareness responsibilities.

# 08 — Research Onboarding Bridge

> **Objective:** Translate the theoretical findings and limits established in Docs 01–07 into executable configurations (`.yaml` specifications) and direct instructions for the pipeline agents. This bridges the gap between *knowing* what to do and actually *operating* the extraction loop.

---

## 1. Metadata Normalization

Before assigning tasks to agents, all the structured data gathered in the analysis phase must be packaged into the `Target Pipeline Manifest` (a centralized configuration object).

### 1.1 Sourcing Matrix to Config

| Analysis Origin | Finding | YAML Output Target |
|---|---|---|
| [01] Requirements | `schema_definition` Array | `transformation.target_schema: []` |
| [02] Discovery | Identified `deep_links` | `scripting.entry_nodes: []` |
| [03] Extraction | Required Stack (Playwright) | `production.compute_tier: heavy_browser` |
| [04] Scaling | Limit = 45 requests/min | `production.rate_limit_per_min: 45` |
| [05] Transformation | Derived math mapping | `qa.validation_rules: []` |
| [06] Delivery | PII exposure risk: High | `compliance.masking_enabled: true` |

---

## 2. Agent Config Generation

The Onboarding Bridge explicitly drafts the behavioral constraints for each active agent running this specific pipeline.

### 2.1 The Scripting Agent Spec Context

```yaml
# Injected into the Scripting Agent's operational context:
target_domain: "airline-target.com"
extraction_engine: "Playwright"
known_defenses: ["Akamai WAF", "Ephemeral Shadow DOM"]
required_output_schema: "s3://schemas/airline_ancillary_v2.json"
dynamic_wait_states: true # E.g., Must wait for skeleton loaders to vanish
```

### 2.2 The Production Scaling Spec Context

```yaml
# Injected into the Production Agent's orchestration context:
proxy_tier_required: "Static Residential - UK Region"
max_concurrent_workers: 4
retry_strategy:
  on_403: "rotate_ip"
  on_429: "exponential_backoff_base_500ms"
  on_shadow_ban: "halt_queue_escalate_to_qa"
```

### 2.3 The QA & Sentinel Spec Context

```yaml
# Injected into the Sentinel Agent's baseline metrics:
acceptable_time_to_first_byte_ms: 850
acceptable_extraction_null_rate: 0.05
alerting_thresholds:
  continuous_failures: 5
  confidence_score_drop: 0.15 # Drop below 85% flags a warning
```

---

## 3. Remediation & Sprint Generation

Rarely is a target 100% "Plug and Play." The Bridge document converts the gaps found in analysis into an actionable sprint backlog for human SME (Subject Matter Experts) or HITL (Human-In-The-Loop) operators.

### 3.1 Gap Remediation Ticket Generation

| Gap Discovered | Automated Action assigned | HITL Ticket Generated |
|---|---|---|
| CAPTCHA blocks 10% of traffic | Production Agent scales workers to compensate | "Evaluate third-party 2Captcha API integration cost" |
| Schema lacks one target field | Transformation Agent relies on LLM fuzzy mapping | "Clarify with Client if missing field Null is acceptable" |
| MFA required for Base Auth | None (system blocks) | "Operator must provide MFA token via interceptor dashboard" |

---

## 4. Final Handoff Execution

1. Build the unified `target-pipeline-config.yaml`.
2. Push configurations to the Master Orchestrator's target registry.
3. Schedule the first "Dry Run" Execution (1% volume test).
4. If Dry Run QA Confidence > 0.90, automatically promote the pipeline to **General Availability (GA)** scheduling.

- [ ] Configuration YAMLs generated
- [ ] Remediation tickets pushed to HITL queue
- [ ] Dry-run execution initialized

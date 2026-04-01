# Agentic Data Production — Infrastructure Implementation Master Plan

> **Purpose:** This is the top-level coordination document for building the agentic data production workflow. It merges the deep research capabilities evaluated in the project skills (Interrogation, Discovery, Orchestration, Validation) with the end-to-end operational workflow defined in the Travel Production Process Framework. Each phase is a separate document with dual-format instructions (human-review technical spec + LLM-agent-ready prompts).

---

## Architecture Decisions (Locked)

| Decision | Choice | Rationale |
|---|---|---|
| Core Orchestration | Master Agent | Centralized control system ensuring the agent ecosystem is scalable, reliable, and sequenced efficiently. |
| Requirement & Intent | Assessment & Interrogation | **Multimodal Ingestion:** Derives intent via direct conversation, parsing requirement docs, or analyzing legacy processes to generate standardized briefs. |
| Deep Research & Feasibility | Discovery & Onboarding | **Conditional Fast-Tracking:** First checks the pre-built script/evasion library; maps unknown sources via specialist deep linking only when existing tools don't suffice. |
| Data Capture Engine | Scripting, Extraction & Production | Reusable script library combined with dynamic cloud scaling, proxies routing, and retry logic for robust payload capture. |
| Validation & Quality | QA & Validation Agents | Cross-references data, performs schema checks, assigns trust/confidence scores, flags logic or range conflicts. |
| Output Standardization | Transformation & Delivery | Formats raw extracts to customized client schemas (CSV/JSON/API) and manages the secure delivery push. |
| Continuous Operations | Sentinel, Support, Compliance | Monitors system SLA latency, handles internal/client queries, and ensures data exposure/security laws are upheld. |

---

## Phase Map

```mermaid
graph TB
  subgraph P0["Phase 0: Orchestration & Governance"]
    P0A["01 — Master Agent & Framework Setup"]
    P0B["02 — Compliance & Security Agent"]
  end

  subgraph P1["Phase 1: Requirement & Assessment"]
    P1A["03 — Assessment & Interrogation Agent"]
    P1B["04 — Scheduling Agent"]
  end

  subgraph P2["Phase 2: Deep Research & Onboarding"]
    P2A["05 — Discovery & Sub-Source Mapping Agent"]
    P2B["06 — Onboarding & Specialist SME Agent"]
    P2C["07 — Scripting Agent"]
  end

  subgraph P3["Phase 3: Production & Data Capture"]
    P3A["08 — Extraction & Orchestration Agent"]
    P3B["09 — Production & Scaling Agent"]
  end

  subgraph P4["Phase 4: Transformation & Validation"]
    P4A["10 — Transformation Agent"]
    P4B["11 — QA & Validation Agent"]
  end

  subgraph P5["Phase 5: Delivery, Support & Monitoring"]
    P5A["12 — Delivery Agent"]
    P5B["13 — Sentinel Monitoring Agent"]
    P5C["14 — Support Agent"]
  end

  P0A --> P1A
  P0B -.-> P1A
  P1A --> P1B
  P1B --> P2A
  P2A --> P2B
  P2B --> P2C
  P2C --> P3A
  P3A --> P3B
  P3B --> P4A
  P4A --> P4B
  P4B --> P5A
  P3B -.-> P5B
  P5A -.-> P5C
```

---

## Dependency Rules

1. **Phase 0 (Governance)** must exist first. The Master Agent orchestrates the sequence, and the Compliance Agent rules must validate system access globally.
2. **Phase 1 (Assessment)** is the entry point. It requires client inputs to generate the `research_brief` (via Interrogation) and schedules the jobs.
3. **Phase 2 (Onboarding)** relies on the brief to discover deep-linked sources, perform feasibility checks, handle edge cases via SME, and develop extraction scripts.
4. **Phase 3 (Production)** depends on Phase 2 scripts. It handles infrastructure scaling, IP proxies, and executes data capture (via Orchestration tooling).
5. **Phase 4 (Validation)** requires the raw payload from Phase 3 to map to client schemas (Transformation), format, and audit against quality standards (QA).
6. **Phase 5 (Delivery)** pushes the validated structured data. The Sentinel Agent continuously monitors the Extraction nodes in parallel to prevent queue bottlenecks.

---

## Document Index

| # | Document | Phase | Dependencies | Focus / Assigned Agent |
|---|---|---|---|---|
| 01 | [01-master-orchestration.md](01-master-orchestration.md) | 0 | — | Master Agent: Control Center, Pipeline Design |
| 02 | [02-compliance-security.md](02-compliance-security.md) | 0 | 01 | Compliance Agent: Credentials, Audit, Risk |
| 03 | [03-assessment-interrogation.md](03-assessment-interrogation.md) | 1 | 01 | Assessment/Interrogation Agent: Multimodal Ingestion, Intent Parsing |
| 04 | [04-scheduling-triggering.md](04-scheduling-triggering.md) | 1 | 03 | Scheduling Agent: Queueing, SLA Constraints |
| 05 | [05-source-discovery.md](05-source-discovery.md) | 2 | 03 | Discovery Agent: Fast-tracking, Deep Links |
| 06 | [06-onboarding-sme.md](06-onboarding-sme.md) | 2 | 05 | Onboarding/SME Agent: Feasibility, Evasion Configs |
| 07 | [07-scripting-repository.md](07-scripting-repository.md) | 2 | 06 | Scripting Agent: Script Development, Repo Mgmt |
| 08 | [08-extraction-orchestration.md](08-extraction-orchestration.md) | 3 | 07 | Extraction Agent: Tool Selection (SPA/PDF), Run Logic |
| 09 | [09-production-scaling.md](09-production-scaling.md) | 3 | 08 | Production Agent: Dynamic Scale, Proxy Rotation |
| 10 | [10-transformation-mapping.md](10-transformation-mapping.md) | 4 | 09 | Transformation Agent: Schema Formatting (CSV/JSON) |
| 11 | [11-qa-validation.md](11-qa-validation.md) | 4 | 10 | QA/Validation Agent: Confidence Scores, Triangulation |
| 12 | [12-delivery-pipelines.md](12-delivery-pipelines.md) | 5 | 11 | Delivery Agent: SFTP/API Push, Export Management |
| 13 | [13-sentinel-monitoring.md](13-sentinel-monitoring.md) | 5 | 09 | Sentinel Agent: Failure Detection, Run Tracking |
| 14 | [14-system-support.md](14-system-support.md) | 5 | 12 | Support Agent: Internal/External Helpdesk, Comms |

---

## Document Format Convention

Every phase document strictly adheres to this structure:

```markdown
# Phase Title

## Overview (Human Review)
- What this phase accomplishes
- Key design decisions and trade-offs
- Prerequisites and outputs

## Step-by-Step Instructions (Agent Consumption)

### Step N: [Action Title]
**Objective:** What this step produces
**Prerequisites:** What must exist before this step
**Artifacts to produce:**
- Exact files/resources to create
**Instruction:**
> [Prompt-ready instruction for LLM agent]
**Acceptance criteria:**
- How to verify the step is complete
```

# 01 — Requirement & Assessment Analysis

> **Objective:** Evaluate the clarity, scope, and initial feasibility of the client's data request before passing it to deep discovery. This forms the baseline "intent" that all downstream agents must fulfill.

---

## 1. Intent Clarity & Scope

### 1.1 Request Decomposition

For every incoming data requirement, analyze:

| Field | Source | Notes |
|---|---|---|
| Client ID / Name | Assessment Form | Who is requesting this? |
| Core Target Domain | User Prompt | Primary website/app (e.g., `aa.com`) |
| Data Points Needed | User Prompt | Explicit fields (e.g., Baggage rules, seat prices) |
| Allowed Depth | Guardrails | E.g., Follow pagination? Scrape sub-domains? |
| SLA Request | User Prompt | Frequency (daily/weekly/one-off) and timeframe (e.g., must finish in 4 hours) |

### 1.2 Intent Ambiguity Flags

Identify potential misalignments before they hit extraction nodes:

| Flag | Condition | Impact |
|---|---|---|
| Unclear Boundary | Request is "pull all data" rather than specific schemas | Infinite looping risk |
| Ambiguous Refresh | Client asks for "live" data without specifying latency tolerance | API constraint violation |
| Multimodal Gap | User provided an image/PDF requirement that cannot be OCR'd | Missing target fields |
| Authenticated Wall | Target requires login but no credentials were provided in the request | Immediate block |

---

## 2. Scheduling & Constraint Mapping

### 2.1 Volume Estimation

Compute the preliminary order of magnitude for the request:

| Metric | Origin | Purpose |
|---|---|---|
| Base Entry Points (URLs) | Client brief | Starting nodes |
| Estimated Breadth (X) | Number of variations (Dates/Routes) | Multiply factor |
| Estimated Depth (Y) | Search result pages per origin | Multiply factor |
| **Total Expected Pages** | Entry × Breadth × Depth | Determines scaling needs |

### 2.2 Feasibility Check (Scheduling)

- **Total Expected Pages:** e.g., 50,000 pages
- **SLA Deadline:** e.g., 12 hours
- **Required Throughput:** 50,000 / 720 minutes = ~69 pages/minute.

> [!IMPORTANT]
> If required throughput exceeds the target's estimated rate limit (or our available proxy pool bandwidth), the SLA must be flagged as `🟡 At Risk` or `🔴 Impossible` before passing to Discovery.

---

## 3. Pre-Flight Scoring

### 3.1 Requirement Completeness Scorecard

Assess the brief across defining factors:

| Element | Criteria for "Complete" | Weight |
|---|---|---|
| Schema Definition | Exact output structure (JSON/CSV keys) defined | High |
| Target Scope | Constraints (URL masks, date ranges) explicitly bounded | High |
| Credential Provision | Required logins tested and confirmed active | Medium |
| SLA Realistic | Throughput requirement matches general web norms | Medium |
| Delivery Destination | S3 bucket, SFTP, or API endpoint pre-configured | Low |

**Aggregate:** Requirement Quality Score (RQS) = weighted sum / max possible

### 3.2 Output: Metadata for Discovery

This analysis produces a validated structured `research_brief` consumed by downstream nodes.

| Consumer | What They Need | From This Doc |
|---|---|---|
| **Discovery Agent** | Targeted URLs, depth constraints | Section 1 |
| **Scheduling Agent** | Priority, maximum allowed nodes per minute | Section 2 |
| **Transformation Agent** | Target schema definition | Section 3 |

---

## 4. Analysis Checklist

- [ ] Intent successfully decomposed into `research_brief` structure
- [ ] Ambiguity flags checked (No unbounded limits)
- [ ] Volume mathematically estimated and cross-referenced with SLA
- [ ] Target schemas documented for Transformation Agent
- [ ] **Domain readiness score assigned (1–5)**

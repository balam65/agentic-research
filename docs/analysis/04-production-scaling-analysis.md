# 04 — Production & Scaling Analysis

> **Objective:** Define the infrastructure, proxy routing, and concurrency requirements to reliably hit the required data volumes (derived from Doc 01) without triggering the target's anti-bot defenses mapped in Doc 02.

---

## 1. Proxy Architecture & Rotation Needs

### 1.1 Proxy Type Evaluation

To evade the specific defenses of this target, which proxy tier is required?

| Proxy Tier | Cost Profile | Best For | Requirement for this Target |
|---|---|---|---|
| Datacenter (DC) | Lowest ($) | Weak-defense targets, public APIs | Yes/No? |
| Static Residential (ISP) | Medium ($$) | E-commerce targets requiring stable sessions | Yes/No? |
| Rotating Residential (Resi) | High ($$$) | Aggressive geofencing, IP rate limits | Yes/No? |
| Mobile IP (5G) | Highest ($$$$) | Mobile-app APIs, strict bot-protection (Datadome/Akamai) | Yes/No? |

### 1.2 Rotation Strategy

Determine the frequency of IP switching based on state requirements:
- **Sticky Sessions:** IP must remain consistent throughout the multi-step extraction (e.g., maintaining a user cart).
- **Per-Request Rotation:** Every single request is assigned a fresh IP to bypass strict per-minute rate limits.

---

## 2. Concurrency & Rate Limit Boundaries

### 2.1 Experimental Threshold Mapping

If the target's threshold is undocumented, estimate the physical limits:

| Metric | Target Limit (Estimated) | Safety Buffer (Agent Cap) |
|---|---|---|
| Max Requests Per IP / Minute | e.g., 60 | 45 (75% of max) |
| Max Concurrent Sessions (Global) | e.g., 500 connections | 400 connections |
| Error Threshold (429 / 403) | At what frequency does the target temporarily ban the subnet? | 5 errors/min |

### 2.2 Auto-Scale Calculation

Based on the [Doc 01 SLA Requirement](01-requirement-assessment-analysis.md) (e.g., 69 pages/min) and the limits above:
- **Formula:** Required Pages/Min ÷ Safety Buffer Limit/Min = Required Concurrent IP/Workers.
- **Example:** 69 ÷ 45 = ~2 Concurrent workers required. This target scales easily.

> [!WARNING]
> If auto-scale calculation shows a required compute footprint that exceeds the daily execution budget defined for this tier, the Agentic OS Orchestrator must immediately signal an SLA breach warning to the user.

---

## 3. Payload Failure Triggers

How should the Production Orchestrator handle failures during scale?

| Failure Type | Trigger Response | Downstream Action |
|---|---|---|
| HTTP 429 (Too Many Requests) | Backoff detected | Rotate IP pool, reduce concurrency by 20% |
| HTTP 403 (Forbidden) | WAF block | Shift to higher proxy tier (e.g., DC -> Resi) |
| Timeout / 504 | Target origin struggling | Increase latency waits, lower overall throughput |
| Payload Empty (200 OK) | Silent bot-protection trap | Halt extraction; send to QA Agent for review |

---

## 4. Metadata Handover

This document feeds the dynamically scaling Production Agent.

| Consumer | What They Need | From This Doc |
|---|---|---|
| **Production Agent** | Concurrency bounds, proxy pool selection, retry strategy | Section 1, 2, 3 |
| **Sentinel Agent** | Baseline limits to trigger alerts (e.g., 403 blocks per minute) | Section 3 |
| **Delivery Agent** | Expected time-to-completion based on scaled throughput | Section 2 |

---

## 5. Analysis Checklist

- [ ] Appropriate Proxy Tier selected based on defense profile
- [ ] IP Rotation strategy (Sticky vs Rotating) defined
- [ ] Safe concurrency limits established against expected SLA
- [ ] Failure trigger responses mapped
- [ ] **Domain readiness score assigned (1–5)**

# 09 — Autonomous Agent Execution Playbook

> **Objective:** Define exactly how AI agents execute the entire deep-dive target analysis framework (Docs 01–08) end-to-end with minimal human intervention. This process evaluates a new extraction source rapidly, producing the final configurations needed to add a new domain to the Agentic Research pipeline.

---

## 1. Design Principles

### 1.1 Autonomy-First Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  INPUTS (Client or internal team provides)                  │
│  • Target domain (e.g., airline.com)                        │
│  • Target data schema (e.g., JSON structure required)       │
│  • SLA constraints (Volume/Frequency)                       │
│  • Credentials (if authenticated session needed)            │
└──────────────┬──────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────┐
│  ANALYSIS PIPELINE (Agents execute autonomously)            │
│   Phase 1: Assessment (Schema and Intent validation)        │
│   Phase 2: Discovery (Endpoints, API hooks, Defenses)       │
│   Phase 3: Complexity & Scaling Calculation                 │
│   Phase 4: Transformation Mapping & QA Bounding             │
│   Phase 5: Synthesis & Config Generation (Bridge Doc 08)    │
└──────────────┬──────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────┐
│  OUTPUTS (Ready for Pipeline Production)                    │
│  • Complete readiness report & go/no-go recommendation      │
│  • target-pipeline-config.yaml                              │
│  • Baseline extraction scripts (v1.0.0)                     │
│  • HITL intervention tickets (if edge cases detected)       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Core Execution Rules

1. **Idempotent Investigation:** Analysis agents should *never* write data to a live client drop during discovery. All test extracts write to a `/dev/null` equivalent or a local QA staging cache.
2. **Defensive Scaling:** The Discovery agent probes at 1 request/second maximum to avoid permanently burning the research proxy IPs during investigation.
3. **Escalation Triggers:** If confidence drops below 60% on *any* analysis metric (e.g., unable to map a deeply obfuscated API), the agent pauses and triggers an SME review rather than hallucinating script mappings.
4. **Transparent Logic:** Every generated extraction script, proxy limit, and validation rule must include an agent-written rationale comment explaining *why* it was chosen based on the target's DOM.

---

## 2. Agent Roles in the Playbook

| Agent Role | Evaluation Responsibility | Autonomy Level |
|---|---|---|
| **Master Orchestrator** | Manages the sequence, assigns targets, synthesizes final go/no-go (Doc 07). | L3 (Fully Autonomous) |
| **Assessment & Interrogation** | Parses the client brief, generates the `research_brief` intent (Doc 01). | L3 |
| **Discovery Agent** | Maps endpoints, reads robots.txt, analyzes WAF headers (Doc 02). | L3 |
| **Scripting Agent** | Analyzes DOM complexity, builds the prototype extraction logic (Doc 03). | L2 (Scripts require test validation) |
| **Production Agent** | Runs synthetic load tests to baseline the rate limits (Doc 04). | L3 |
| **Transformation Agent** | Compares schema needs, writes the regex/LLM mappings (Doc 05). | L3 |
| **Compliance Agent** | Audits PII exposure and credentials (Doc 06). | L2 (Requires final human signoff) |

---

## 3. Execution Pipeline — Step by Step

### Phase A: Requirements & Target Lock (Docs 01)
1. **Interrogation Agent** reads the client payload. 
2. Generates semantic mapping of requested fields.
3. Identifies impossible constraints (e.g., infinite depth requests).
4. Outputs the `research_brief`.

### Phase B: Reconnaissance (Docs 02 & 03)
1. **Discovery Agent** executes a multi-pronged mapping of the domain.
   - Standard GET request to check routing.
   - Headless browser trace to capture XHR/Network payloads.
   - Subdomain enumeration for exposed internal APIs.
2. Outputs the defense matrix (WAF identified, dynamic classes identified).
3. **Scripting Agent** writes a lightweight `prototype.py` targeting a single valid endpoint.

### Phase C: Scaling Calibration (Doc 04)
1. **Production Agent** runs the `prototype.py` across 5 different IP classifications (DC, Resi, 5G) concurrently.
2. Mathematically calculates the drop-off limit (where 403s spike).
3. Establishes the safe concurrency bounds. 

### Phase D: QA Mapping (Docs 05 & 06)
1. Runs the prototype extract data through the **Transformation Agent**.
2. Evaluates the Delta: "We have 8 of the 10 requested fields. Field 9 is missing. Field 10 requires LLM NLP."
3. **Compliance Agent** scans the output for PII overlap (credit cards, loyalty names). Masking logic is locked.

### Phase E: Synthesis & Bridging (Docs 07 & 08)
1. **Master Orchestrator** pulls all scores. If all scores > 3, calculates cost matrix.
2. Converts analysis findings into `target-pipeline-config.yaml`.
3. Packages the decision block for the Human Operator.

---

## 4. Human Review Gate

> **The Single HITL Bottleneck:** 
> Before the pipeline starts producing client data, a developer reviews the generated config package.

```
╔══════════════════════════════════════════════════════════════╗
║  NEW TARGET ANALYSIS COMPLETE — airline-target.com           ║
║  Overall Viability: 4.2/5.0 (🟢 Ready for scale)           ║
║  Confidence in Scripting: High (0.88)                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  DISCOVERY SYNOPSIS                                          ║
║  Found an unencrypted XHR endpoint fueling the mobile app.   ║
║  Bypassed Cloudflare completely.                             ║
║                                                              ║
║  SCHEMA MAP                                                  ║
║  ✅ 6/6 Target fields successfully parsed in Prototype       ║
║  ⚠ 1 field requires LLM fuzzy logic (baggage_policy)         ║
║                                                              ║
║  SCALING & COST ESTIMATE                                     ║
║  Req pages/min: 45 | Safe limit: 120 (Using DC Proxies)      ║
║  Estimated compute cost per 1M rows: $14.50                  ║
║                                                              ║
║  YOUR DECISION:                                              ║
║  [DEPLOY] Push pipeline config to Production nodes           ║
║  [RE-TEST] Force proxy rotation test before deploy           ║
║  [DISCARD] Target not viable for budget                      ║
╚══════════════════════════════════════════════════════════════╝
```

## 5. Continuous Updating

Because targets deploy new frontend codes and change endpoints:

* Every 7 days, the **Discovery Agent** re-runs the Phase B checks passively in the background.
* If a DOM change is detected _before_ the extraction script fails, it preemptively alerts the **Scripting Agent** to write a v2.0.0 fix branch. 

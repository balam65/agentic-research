# Synthesized Takeaways: Justin + Filip → What They Mean for `agentic-research`

> **Source Materials:**
> - `filip_Agent_situational_awareness.md` — Transcribed mentoring session (~19 min) with Filip (agentic systems architect)
> - `email-justin.txt` — Email thread with Justin on agentic design philosophy
> - `Agentic_Awareness_Summary.md` — Distilled summary of Filip's session

---

## 🧠 Filip's Core Message

Filip's argument is a **philosophical and architectural reset**:

| Filip's Point | What He's Really Saying |
|---|---|
| **"Don't just swap a function with an LLM"** | Wrapping existing workflows in AI ≠ agentic. That's just `if-then-else` with GPT. |
| **4-Layer Model** | Design around: `World Model → Capabilities → Intelligence Layer → Surface Areas` |
| **Situational Awareness** | Agents must share the same data view as humans — a common "world model" / data lake |
| **Capabilities are generic, reusable** | Not tied to one use case. You can have 1,000 — agents pick the right ones via context |
| **Self-evolution over static automation** | New capabilities added → agents automatically incorporate them. No rewiring needed. |
| **Context/manifest files drive awareness** | Agents discover capabilities through files (like SKILL.md) — model-agnostic |
| **Run his agent kernel on your project** | It generates a full review: implementation plan, evaluation artifacts, perspectives |

**Filip's single winning formula:**
> Build a *factory*, not a pipeline. `Capabilities + World Model + Intelligence Layer + Surface Areas` = 100X output.

---

## 📧 Justin's Core Message

Justin's message is more **surgical but equally profound** — directly targeted at project design:

> *"Start by specifying things in terms of only non-negotiable inputs and outputs, rather than in terms of process flow."*

| Justin's Point | Implication |
|---|---|
| **Non-negotiables only at top level** | Strip your spec down to: what MUST go in, what MUST come out. Nothing else belongs at the top. |
| **Don't mandate intermediate outputs unless they have intrinsic value** | e.g., "Structured Research Brief" — only mandate it if a *human* needs to inspect it, not to "help the agent think". |
| **Start minimal, layer nudges** | Define the absolute core, then *optionally* inject inductive biases if the agent struggles. Like min-feature engineering in ML. |
| **Human oversight = the only valid reason to promote intermediate outputs** | If you want HITL at a specific junction, *that* intermediate output earns its place. |

**Justin's analogy:**
> This is like feature engineering for ML — you don't hand-craft features unless the model can't figure them out alone. Same logic applies to agent workflow steps.

---

## 🔀 Where Justin and Filip Converge

Both are independently pointing at the **same root problem** in the current design:

> ❗ The project is designed as a **process flow** (Scheduling Agent → Discovery Agent → Extraction Agent → ...) when it should be a **capability + contract system**.

| Current `agentic-research` Design Pattern | What Justin + Filip Want Instead |
|---|---|
| Fixed sequential agent pipeline | Dynamic assembly of capabilities based on world model context |
| Intermediate steps mandated in the spec | Only non-negotiable I/O at the top level; intermediate steps are internal agent choices |
| Agents mapped to pipeline stages | Agents map to *capabilities*, assembled just-in-time |
| Process flow documented in `.mmd` diagrams | World Model + Capability Registry → Intelligence Layer picks the path |

---

## 🚀 Actionable Recommendations for `agentic-research`

### 🔴 Priority 1 — Reframe the Design Contract *(Justin)*

- Go back to `docs/implementation/` and identify every step
- For each step ask: *"Is this a non-negotiable external output, or is it just internal scaffolding?"*
- Move internal scaffolding **out** of the top-level spec — it becomes optional structure the agent can choose to use
- The true non-negotiables for this domain are likely:
  - **Input:** Requirement / target specification
  - **Output:** Validated, delivered data
- Everything in between is the agent's problem to solve

---

### 🟠 Priority 2 — Introduce a World Model Layer *(Filip)*

- Create a **shared state/event store** — all agent actions, extraction results, KPIs, anomalies logged uniformly
- Both agents AND any human operator dashboards read from this same layer
- This maps to a `world_model/` module in the project — **currently missing**
- n8n workflows would **write to** and **read from** this shared layer rather than passing data linearly
- The world model is the foundation of situational awareness for both agents and humans

---

### 🟡 Priority 3 — Convert Agents into Capabilities *(Filip)*

- Restructure agent roles from pipeline-stage names → generic reusable capabilities:

| Current (Pipeline Stage) | Target (Capability) |
|---|---|
| Discovery Agent | `url_discovery` |
| Scheduling Agent | `schedule_manager` |
| Extraction Agent | `data_extractor` |
| Master Agent | `orchestrator` |

- The **orchestrator / intelligence layer** assembles whichever capabilities are needed based on context
- This is what `orchestration/prompts/` and the SKILL.md pattern approach — but needs to be made explicit
- Capabilities should be **generic** — not constrained to a specific target or domain

---

### 🟢 Priority 4 — Run Filip's Agent Kernel Review *(Filip)*

- Filip explicitly recommended pulling down his agent kernel and running it against your project
- It produces: implementation plan, evaluation, artifact bundle — effectively a **free architectural audit**
- This would validate whether current `docs/implementation/` phases align with the 4-layer model
- Use this as a checkpoint before committing to the next phase of implementation

---

### 🔵 Priority 5 — Build a Surface Area / Visibility Layer *(Filip)*

- The project currently has **no visibility layer**
- A lightweight command-center view (even simple: agent states, world model events, KPI trends) would make the system observable and debuggable
- This sits **on top of the world model** and doesn't change agent logic
- Aligns with the "infinite dashboards" concept — built once on the world model, reconfigurable at will

---

## 🧭 TL;DR — The Single Most Important Shift

> Both Justin and Filip are telling you the same thing in different words:
>
> **Stop designing the process. Start designing the contract (inputs/outputs) and the capabilities (skills). Let the agents design the process.**

The `agentic-research` project has the right *intent* and the right *domain* — but it is currently architected as a smart pipeline. The next evolution is to make it a true **agentic factory**:

```
Non-negotiable I/O Contract
        ↓
World Model (shared situational awareness)
        ↓
Capability Registry (generic, reusable, composable skills)
        ↓
Intelligence Layer (agents assemble capabilities dynamically)
        ↓
Surface Areas (dashboards, reports, command centers)
```

This alone — if followed correctly — is the winning play.

---

*Generated: 2026-04-08 | Based on inputs from Filip (agentic systems architect) and Justin (email thread)*

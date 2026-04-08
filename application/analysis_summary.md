# Application Folder Analysis & Gap Prioritization

## Overview of the `application` Directory

The `application` folder contains the core runtime implementation of the **Agentic Research** platform.  It is organized as a small TypeScript code‑base that follows a **World‑Model‑Driven Event‑Bus** architecture.

| Sub‑directory | Purpose | Key Files |
|---|---|---|
| `src/capabilities/` | Individual **capabilities** (formerly “agents”) that perform concrete work such as assessment, URL discovery, scripting, extraction, QA, delivery, etc. Each capability lives in its own folder with an `index.ts` that exports a class exposing a public method used by the orchestrator. | `assessment/index.ts`, `url_discovery/...`, `scripting/...` (most are placeholders at the moment) |
| `src/orchestrator/` | The **OrchestratorRouter** (`router.ts`) receives `WorldModelEvent`s from the shared event store and routes them to the appropriate capability based on the event name. It also enforces a simple **HITL policy** (confidence‑score < 0.80). | `router.ts` |
| `src/world_model/` | Implements a **central event store** using Supabase. `store.ts` defines `WorldModelStore` with `publishEvent` / `getRecentEvents`. `events.yaml` describes the canonical event schema (not yet consumed programmatically). | `store.ts`, `events.yaml` |
| `src/surface_areas/` | Intended UI / dashboard layer (e.g., a *command‑center*). Currently only a placeholder folder (`command-center/`) with no implementation. | – |
| `src/` (root) | Glue code that ties the above pieces together. The folder also contains a `capabilities` folder with a `hitl_policy.yaml` that defines thresholds for human‑in‑the‑loop handling, but the router only checks the confidence score directly. |
| `n8n_workflows/`, `prompts/`, `utils/` (top‑level) | External orchestration assets used by the original n8n‑based pipeline (JSON workflow definitions, prompt markdown files, utility scripts). They are **not** directly referenced by the TypeScript code yet. |

### What the code currently does
1. **Event ingestion** – External agents (or the n8n workflows) push events into the Supabase table `world_model_events`.
2. **Orchestrator routing** – The `OrchestratorRouter.handleEvent` method receives an event (presumably via a subscription) and, based on `event_name`, invokes the matching capability method.
3. **Capability execution** – Each capability performs a single, well‑scoped action (e.g., `AssessmentCapability.parseIntent`). After completing its work it publishes a new event (e.g., `assessment_completed`).
4. **Human‑in‑the‑loop (HITL)** – If an event’s `confidence_score` is below `0.80`, the router logs a warning and stops further processing.
5. **World model persistence** – All events are stored in Supabase, providing a shared source of truth for situational awareness.

## Identified Gaps (Ranked by Priority)

| Priority | Gap | Description | Impact | Suggested Fix |
|---|---|---|---|---|
| **High** | **Missing Surface‑Area / Dashboard** | `src/surface_areas/command-center` is empty; there is no UI for operators to view the world‑model, monitor capability health, or intervene manually. | Operators cannot observe system state, making debugging and HITL difficult. | Implement a lightweight web dashboard (e.g., Next.js) that queries `WorldModelStore` and visualises recent events, capability statuses, and alerts. |
| **High** | **Incomplete Capability Implementations** | Only `assessment` capability has concrete logic; other folders (`url_discovery`, `scripting`, `data_extractor`, etc.) are placeholders with no code. | The orchestrator will hit `undefined` methods at runtime, breaking the pipeline. | Scaffold each capability with a minimal class exposing the expected method (matching the router’s switch cases) and stub implementations that publish the next event. |
| **High** | **HITL Policy Not Enforced via `hitl_policy.yaml`** | The router hard‑codes a confidence‑score threshold and never reads the `hitl_policy.yaml` file. | Policy changes require code edits; cannot configure per‑event thresholds. | Load `hitl_policy.yaml` at startup and use its rules (e.g., per‑event confidence thresholds, required human approval steps). |
| **Medium** | **World‑Model Event Schema Not Programmatically Validated** | `events.yaml` defines the canonical schema but `store.ts` accepts any payload. No runtime validation or TypeScript types. | Bad or malformed events can corrupt the event store and cause downstream failures. | Generate TypeScript interfaces from `events.yaml` (or use a JSON schema validator) and enforce them in `publishEvent`. |
| **Medium** | **No Integration with Existing n8n Workflows** | The top‑level `orchestration/n8n_workflows/*.json` files are never invoked by the TypeScript runtime. | Redundant duplicated orchestration; manual sync required. | Add a bridge that subscribes to Supabase events and triggers the appropriate n8n workflow via its REST API, or migrate the n8n logic into the TypeScript orchestrator. |
| **Medium** | **Missing “Analysis Bridge” for YAML Configs** | The analysis phase (docs) produces `target‑pipeline‑config.yaml` but the runtime never reads it to configure capabilities (e.g., proxy settings, extraction rules). | Manual copy‑paste steps, risk of out‑of‑date configs. | Extend `WorldModelStore` or a new `ConfigLoader` to ingest the YAML files at startup and expose them to capabilities. |
| **Low** | **No Unified Target Registry** | Target definitions are scattered across `script_catalog_db.sql`, `knowledge_repo_schema.yaml`, and analysis YAMLs. | Potential source‑of‑truth conflicts as the system scales. | Consolidate into a single `targets` table in Supabase and expose CRUD APIs. |
| **Low** | **Lack of Tests & CI** | No test suite for capabilities, orchestrator, or world‑model store. | Regression risk, hard to verify fixes. | Add Jest tests for each capability and integration tests that simulate event flows. |
| **Low** | **Hard‑coded Supabase credentials fallback to empty strings** | `store.ts` defaults to empty strings if env vars are missing, leading to runtime connection failures. | Deployment failures in environments without proper env configuration. | Throw a clear error if required env vars are missing; provide a `.env.example`. |
| **Low** | **No Documentation for Codebase** | The source files lack JSDoc/comments describing public APIs. | New contributors face steep onboarding. | Add JSDoc to each class/method and generate a typedoc site. |

### Quick Action Plan (Top‑3 Items)
1. **Implement the missing capabilities** – scaffold each folder with a class, method, and event publishing stub so the orchestrator can run end‑to‑end without crashes.
2. **Build the command‑center dashboard** – a simple React/Next.js app that reads from `WorldModelStore` and displays recent events, confidence scores, and a manual “trigger HITL” button.
3. **Wire the HITL policy file** – load `hitl_policy.yaml` at runtime and replace the hard‑coded confidence check with configurable rules.

Once these high‑priority items are in place, the system will be functional enough to evaluate the medium‑priority integration gaps (analysis bridge, n8n sync, schema validation) and then move on to polish items (tests, docs, unified registry).

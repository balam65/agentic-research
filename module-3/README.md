# Module 3 - Capability Pipeline (Assessment to QA)

This module implements Intern Module 3 as a standalone TypeScript project.

## Scope

- In-process capability pipeline from `input_received` through `qa_validated`.
- Emits `delivery_handoff_ready` on QA success for Intern Module 6 integration.
- Emits `hitl_required` for low-confidence and failure events for Intern Module 2 handling.
- Uses an abstract `WorldModelPort` for future Module 4 persistence/log integration.

## Capability Flow

1. Assessment (`input_received` -> `assessment_completed`)
2. Scheduling (`assessment_completed` -> `job_scheduled`)
3. Discovery (`job_scheduled` -> `url_discovered`)
4. Scripting (`url_discovered` -> `script_ready`)
5. Proxy Manager (`script_ready` -> `proxy_acquired`)
6. Extraction (`proxy_acquired` -> `extraction_completed` / `extraction_failed`)
7. QA Validation (`extraction_completed` -> `qa_validated` / `qa_failed`)

## Project Structure

- `src/runtime`: pipeline engine, event bus, registry, HITL policy, context
- `src/capabilities`: one service class per capability
- `src/helpers`: confidence scoring, trace building, schema validation
- `src/types`: public pipeline contracts and type guards
- `src/ports`: world model abstraction + in-memory adapter
- `test`: unit, integration, and contract tests

## Commands

- `npm run dev` - runs `src/demo.ts`
- `npm run typecheck` - TypeScript contract/type validation
- `npm run build` - compile to `dist/`
- `npm test` - run Node test suite
- `npm run lint` - placeholder (no lint config in this module yet)

## Supabase Connection

The module supports a real Supabase adapter through `SupabaseWorldModelPort`.

Set these environment variables before running `npm run dev`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (preferred)

Fallback key names also supported for compatibility:

- `ANOTHERKEY`
- `anotherkey`

If these variables are not set, the demo defaults to in-memory persistence.

## Schema Mapping

When Supabase adapter is enabled, Module 3 writes:

- `research_jobs`: initialize job, update status, update final output URL
- `world_events`: one record per pipeline event
- `extracted_data`: save extraction payload and mark latest as validated after QA
- `capability_registry`: upsert all registered capabilities by `name`

## Input and Output Contracts

### Input (`PipelineInput`)

- `target_domain: string`
- `extracted_schema_definition: Record<string, string | object>`
- `budget_or_time_constraints: { max_pages?: number; max_minutes?: number }`

Module 3 also accepts a direct Module 2 execution envelope:

- `workflow_id`, `decision_id`, `event_type`, `next_task`, `target_capability`
- `input_context.target_url`, `input_context.expected_schema`
- optional `constraints`, `reasoning`, `confidence`, `metadata`

This payload is mapped internally to `PipelineInput` using the Module 2 adapter.

### Output (`PipelineOutput`)

- `validated_data: unknown`
- `traceability_log: Array<{ step; source?; timestamp; reason }>`
- `confidence_score: number`
- `next_action: "delivery_handoff_ready" | "hitl_required"`

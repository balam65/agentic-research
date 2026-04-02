# Phase 1: Assessment & Interrogation Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Implements the Assessment & Interrogation Agent to ingest requirements via direct chat, requirement documents, Shop Manager submissions, API integrations, email/manual intake, or legacy analysis, transforming them into a standardized `research_brief`.
- **Key design decisions and trade-offs:** Multimodal ingestion routes all inputs into a single LLM intent-resolution function. This unifies processing but requires the agent to accurately determine when ambiguity requires human intervention versus automated assumption.
- **Prerequisites and outputs:**
  - *Prerequisites:* Master Agent deployed.
  - *Outputs:* `ingestion_router.py`, `brief_generator.py`, and `request_intake_schema.yaml`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Multimodal Ingestion Router
**Objective:** Route incoming requests based on payload type.
**Prerequisites:** None.
**Artifacts to produce:**
- `agentic-research/agents/assessment/ingestion_router.py`
**Instruction:**
> Write an `ingestion_router.py` script. Create a class that accepts an incoming payload. Support request channels for Shop Manager, API integrations, email/manual submissions, and direct JSON/Text chat. If the payload is JSON/Text (chat), route to `parse_conversation()`. If the payload is PDF/Docx, route to `parse_document()`. If it's a telemetry log, route to `parse_telemetry()`. Assign a unique `request_id`, capture request metadata (channel, received_at, requester, target source, requested output format), and extract the core entity data to forward to the Intent Engine.
**Acceptance criteria:**
- Router successfully identifies input format and calls the appropriate function.
- Router assigns a unique `request_id` and emits request metadata for downstream tracking.

### Step 2: Intent Validation & Brief Generation
**Objective:** Generate the standardized `research_brief` incorporating the logic from `1-user-interrogation.md`.
**Prerequisites:** `ingestion_router.py` deployed.
**Artifacts to produce:**
- `agentic-research/agents/assessment/brief_generator.py`
**Instruction:**
> You are the Intent Agent. Implement `brief_generator.py`. Utilize the structured system prompt from `user-interrogation-agent-prompt.md`. Validate required fields such as target source, time/date range, and requested output format before producing the final brief. Resolve declared dependencies such as credentials, endpoints, or required access context into a structured dependency block. Ensure the output strictly conforms to the `research_brief` YAML structure (containing intent, core_objective, topics, constraints). If fields like `time_sensitivity` or `preferred_sources` are entirely unresolvable, raise a `RequirementAmbiguityError` to trigger human-in-the-loop chat.
**Acceptance criteria:**
- The agent outputs a fully structured `research_brief` YAML.
- `RequirementAmbiguityError` fires correctly on missing critical constraints.
- Required inputs and dependency references are validated before downstream scheduling.

### Step 3: Request Intake Schema and Tracking Contract
**Objective:** Standardize intake metadata so scheduling and orchestration can consume requests safely.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/assessment/request_intake_schema.yaml`
**Instruction:**
> Define `request_intake_schema.yaml`. Include fields for `request_id`, `source_channel`, `received_at`, `requester_id`, `target_sources`, `time_range`, `output_format`, `delivery_target`, `dependency_status`, and `validation_status`. Mark Shop Manager, API, email/manual, and chat as accepted channel types.
**Acceptance criteria:**
- The schema captures request identity, metadata, validation status, and dependency resolution state.

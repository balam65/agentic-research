# Phase 1: Assessment & Interrogation Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Implements the Assessment & Interrogation Agent to ingest requirements via direct chat, requirement documents, or legacy analysis, transforming them into a standardized `research_brief`.
- **Key design decisions and trade-offs:** Multimodal ingestion routes all inputs into a single LLM intent-resolution function. This unifies processing but requires the agent to accurately determine when ambiguity requires human intervention versus automated assumption.
- **Prerequisites and outputs:**
  - *Prerequisites:* Master Agent deployed.
  - *Outputs:* `ingestion_router.py` and `brief_generator.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Multimodal Ingestion Router
**Objective:** Route incoming requests based on payload type.
**Prerequisites:** None.
**Artifacts to produce:**
- `agentic-research/agents/assessment/ingestion_router.py`
**Instruction:**
> Write an `ingestion_router.py` script. Create a class that accepts an incoming payload. If the payload is JSON/Text (chat), route to `parse_conversation()`. If the payload is PDF/Docx, route to `parse_document()`. If it's a telemetry log, route to `parse_telemetry()`. Extract the core entity data to forward to the Intent Engine.
**Acceptance criteria:**
- Router successfully identifies input format and calls the appropriate function.

### Step 2: Intent Validation & Brief Generation
**Objective:** Generate the standardized `research_brief` incorporating the logic from `1-user-interrogation.md`.
**Prerequisites:** `ingestion_router.py` deployed.
**Artifacts to produce:**
- `agentic-research/agents/assessment/brief_generator.py`
**Instruction:**
> You are the Intent Agent. Implement `brief_generator.py`. Utilize the structured system prompt from `user-interrogation-agent-prompt.md`. Ensure the output strictly conforms to the `research_brief` YAML structure (containing intent, core_objective, topics, constraints). If fields like `time_sensitivity` or `preferred_sources` are entirely unresolvable, raise a `RequirementAmbiguityError` to trigger human-in-the-loop chat.
**Acceptance criteria:**
- The agent outputs a fully structured `research_brief` YAML.
- `RequirementAmbiguityError` fires correctly on missing critical constraints.

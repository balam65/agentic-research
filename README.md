# Agentic Research

`agentic-research` now uses a capability-driven architecture instead of a fixed pipeline.

## Primary Runtime Structure

- [`world_model/`](./world_model/) stores append-only task, artifact, metric, and error history.
- [`capabilities/`](./capabilities/) contains reusable execution skills with explicit contracts.
- [`intelligence/`](./intelligence/) dynamically selects capabilities from world-state and goal gaps.
- [`context/`](./context/) provides manifest-based discovery and system contract files.
- [`surface/`](./surface/) exposes observability and human-facing views on the shared world model.
- [`interfaces/`](./interfaces/) defines external request/response entry points.
- [`evaluation/`](./evaluation/) captures validation criteria and dynamic-orchestration scenarios.

## Contract

- Input: request id, target specification, requested schema, and governing constraints
- Output: validated result plus a delivery receipt when external delivery is requested

Intermediate artifacts are internal unless governance requires human inspection.

## Legacy Areas

The older `application/` and `orchestration/` folders remain in the repository as historical scaffolding and migration reference. The root-level folders listed above are the primary implementation target for the redesigned agentic platform.

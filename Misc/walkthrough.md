# Agentic Research Diagram Generation Walkthrough

## Overview

Based on the agreed-upon implementation plan, four core architectural state/flow diagrams were created for the `agentic-research` ecosystem. They translate the textual `.md` phase implementation descriptions into Mermaid (`.mmd`) visual flows, mirroring the stylistic and structural guidelines set in the `agentic-os` `docs/diagrams` space.

## Changes Made

### 1. Created Core Diagrams Layout

The following diagrams were generated in the new `/agentic-research/docs/diagrams/` folder:

- **[agentic-research-architecture.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-os/agentic-research/docs/diagrams/agentic-research-architecture.mmd)**
  Maps out the full ecosystem from Phase 0 to Phase 5, placing all independent node "Agents" inside their respective logical control spheres. It serves as the primary technical overview of the system.
  
- **[research-orchestration-flow.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-os/agentic-research/docs/diagrams/research-orchestration-flow.mmd)**
  Charts the end-to-end traversal of a data payload—from the Initial Client Request across the Ingestion Router to the final Secure Deliverable out of the QA auditor.

- **[assessment-discovery-handoff.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-os/agentic-research/docs/diagrams/assessment-discovery-handoff.mmd)**
  Focuses deeply on Phases 1 and 2, specifically visualizing the conditional logic mapping multimodal chat to a YAML `research_brief`, handling ambiguity escalations, and deciding when to rely on pre-built cache scripts versus deploying the SME Agent for discovery.
  
- **[extraction-scaling-pipeline.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-os/agentic-research/docs/diagrams/extraction-scaling-pipeline.mmd)**
  Zeroes in on Phase 3 and its connection with Phase 5 monitoring. Visualizes how extraction jobs are drawn from the Queue, routed to appropriate payload tools, dispersed across a dynamic proxy array, and watched/retried by the Sentinel Agent loop.

### 2. Standardized Repository Metadata
  
- **[registry.json](file:///Users/balasubramanianmahadevan/Documents/agentic-os/agentic-research/docs/diagrams/registry.json)**
  A strict schema mapping each diagram file back to the Markdown specification docs (e.g., `00-master-plan.md`, `08-extraction-orchestration.md`). This facilitates programmatic embeddings similar to `agentic-os`.
  
- **[README.md](file:///Users/balasubramanianmahadevan/Documents/agentic-os/agentic-research/docs/diagrams/README.md)**
  Guidance on viewing and maintaining the `.mmd` files in the directory.

## Validation & Next Steps

If your documentation workflows natively utilize the `.mmd` diagrams or the `python3 scripts/embed_diagrams.py` embedder, the registry has already explicitly linked these new visual structures to your `.md` implementation modules.

If you add new phases or further delineate the existing ones, copy the style and mapping pattern established here!

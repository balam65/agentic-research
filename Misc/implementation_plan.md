# Agentic Research Architectures — Implementation Plan

This plan details the creation of a standard set of structural flowcharts for the `agentic-research` project, modeled strictly on the conventions established in the `agentic-research` `docs/diagrams` folder. We will use Mermaid (`.mmd`) to depict the technical relationships mapped out in the implementation `.md` phase files.

## Proposed Changes

We will create a new directory `docs/diagrams` in the `agentic-research` project and populate it with the following core architectural flowcharts and a registry file.

### Agentic Research Ecosystem Diagrams

#### [NEW] [agentic-research-architecture.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-research/docs/diagrams/agentic-research-architecture.mmd)
A high-level systems diagram showing the Master Agent orchestrating the 5 main phases:
- **Phase 1: Requirement & Assessment** (Assessment, Scheduling)
- **Phase 2: Deep Research** (Discovery, Onboarding SME, Scripting)
- **Phase 3: Production** (Extraction Orchestration, Scaling)
- **Phase 4: Transformation & Validation** (Transformation, QA)
- **Phase 5: Delivery & Support** (Delivery, System Support, Sentinel)

#### [NEW] [research-orchestration-flow.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-research/docs/diagrams/research-orchestration-flow.mmd)
A sequence mapping the data handoffs:
Requirement Payload (Chat/Doc/Legacy) -> Multimodal Ingestion Router -> `research_brief` -> Discovery Map -> Script / Evasion Tools -> Raw Scraped Payload -> Standardized Schema -> Target Output (API/SFTP).

#### [NEW] [extraction-scaling-pipeline.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-research/docs/diagrams/extraction-scaling-pipeline.mmd)
A deep-dive on the highly technical execution phase:
Orchestrator Node routing requests to tools (Browser Adapter / HTTP Adapter / PDF Reader) -> Dynamic scaling systems -> Proxy rotation -> Sentinel failure detection loop.

#### [NEW] [assessment-discovery-handoff.mmd](file:///Users/balasubramanianmahadevan/Documents/agentic-research/docs/diagrams/assessment-discovery-handoff.mmd)
A deep-dive on the early intent-gathering and fast-tracking logic:
Connecting the `Assessment & Interrogation Agent` with the `Source Discovery Agent` to show how intent is verified, missing constraints raise human-in-the-loop (HITL) errors, and known sources are fast-tracked compared to unknown sources sent to the SME Agent.

#### [NEW] [registry.json](file:///Users/balasubramanianmahadevan/Documents/agentic-research/docs/diagrams/registry.json)
The central metadata registry indexing these new `.mmd` diagrams to the target markdown implementations mapping them to `docs/implementation/*`, following the standard `agentic-research` deployment pipeline logic.

#### [NEW] [README.md](file:///Users/balasubramanianmahadevan/Documents/agentic-research/docs/diagrams/README.md)
Instructions on how the mermaid diagrams are embedded, matching the boilerplate found in `docs/diagrams/README.md`.

## User Review Required

> [!IMPORTANT]  
> Are these four diagram foci (Ecosystem Architecture, Orchestration Flow, Extraction Scaling, and Assessment Handoff) comprehensive enough for your immediate needs? 
> Would you like to add any other specific diagram (e.g. strict compliance/security mapping)?

## Verification Plan

### Automated Tests
- Syntax validation using local mermaid rules (avoiding complex HTML labels and utilizing simple `graph TB/LR`).

### Manual Verification
- Render the diagrams visually using a Markdown extension or the mermaid live editor to confirm they are aesthetically pleasing, clear, and logically accurate per the implementation documentation.

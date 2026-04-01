# Phase 2: Source Discovery & Deep Linking Implementation

## Overview (Human Review)
- **What this phase accomplishes:** Builds the Source Discovery Agent. The agent maps high-authority domains based on the `research_brief`. It features conditional fast-tracking to check pre-built toolings before launching broad web searches.
- **Key design decisions and trade-offs:** The fast-track approach drastically reduces token costs and latency by bypassing LLM-driven research when known scripts exist. However, it requires rigorous sync with the Scripting Repository.
- **Prerequisites and outputs:**
  - *Prerequisites:* 04-scheduling-triggering.md completed, access to Scripting Repository schema.
  - *Outputs:* `library_lookup.py` and `deep_link_generator.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Library Lookup & Fast-Tracking
**Objective:** Cross-reference requested domains with existing scripts.
**Prerequisites:** Database access to Scripting Repo.
**Artifacts to produce:**
- `agentic-research/agents/discovery/library_lookup.py`
**Instruction:**
> Develop `library_lookup.py`. Create a function `check_existing_scripts(domain_list)`. If a domain from the constraint list matches an active script in the repository, output a FAST_TRACK payload directly bridging to Phase 3 Orchestration. Skip Step 2.
**Acceptance criteria:**
- Script queries the DB natively and returns a boolean or fast-track object.

### Step 2: Recursive Discovery & Deep Mapping
**Objective:** Execute semantic search to find deep links for unknown domains.
**Prerequisites:** Step 1 returns false.
**Artifacts to produce:**
- `agentic-research/agents/discovery/deep_link_generator.py`
**Instruction:**
> You are the Discovery Agent. Write `deep_link_generator.py` utilizing the structured guidelines in `2-discovery.md`. Map queries, filter exclusions, and identify HTML anchors/DOM selectors. Output the standardized `discovery_map` YAML which contains the specific deep-link targets.
**Acceptance criteria:**
- Function produces the complete `discovery_map` YAML for downstream extraction.

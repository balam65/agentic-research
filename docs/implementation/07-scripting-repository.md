# Phase 2: Scripting Repository Management

## Overview (Human Review)
- **What this phase accomplishes:** Establishes the Scripting Agent. This agent provisions, updates, and catalogs specific parser logic, CSS selectors, and data maps for repeat sources.
- **Key design decisions and trade-offs:** Centralizing extraction scripts allows mass reuse. The trade-off is the maintenance burden if DOMs change frequently.
- **Prerequisites and outputs:**
  - *Prerequisites:* 06-onboarding-sme.md completed.
  - *Outputs:* `script_catalog_db.sql` and `script_generator.py`.

## Step-by-Step Instructions (Agent Consumption)

### Step 1: Initialize Script Catalog
**Objective:** Define the storage schema for extraction scripts.
**Prerequisites:** Postgres instance.
**Artifacts to produce:**
- `agentic-research/agents/scripting/script_catalog_db.sql`
**Instruction:**
> Create the `script_catalog_db.sql` schema. Define a `scripts` table storing `domain`, `version_number`, `css_selectors` (JSONB), `required_proxies` (Boolean), and `status` (ACTIVE/DEPRECATED).
**Acceptance criteria:**
- Valid SQL schema.

### Step 2: Automated Parser Generation
**Objective:** Generate basic parsing logic from new DOM structures.
**Prerequisites:** Step 1 completed.
**Artifacts to produce:**
- `agentic-research/agents/scripting/script_generator.py`
**Instruction:**
> Write `script_generator.py`. Provide logic that takes an HTML snippet and the Target Field, and uses an LLM to automatically generate the optimal `XPath` or `CSS Selector` for that data point. Save this finding to the `scripts` table for future usage.
**Acceptance criteria:**
- Script successfully connects to LLM, queries for selectors, and updates the database.

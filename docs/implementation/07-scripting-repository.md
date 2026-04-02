# Phase 2: Scripting Repository Management

## Overview (Human Review)
- **What this phase accomplishes:** Establishes the Scripting Agent. This agent provisions, updates, and catalogs specific parser logic, CSS selectors, and data maps for repeat sources.
- **Key design decisions and trade-offs:** Centralizing extraction scripts allows mass reuse. The trade-off is the maintenance burden if DOMs change frequently. The repository must therefore also preserve source-specific intelligence, validation snippets, and variant handling notes.
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
> Write `script_generator.py`. Provide logic that takes an HTML snippet and the Target Field, and uses an LLM to automatically generate the optimal `XPath` or `CSS Selector` for that data point. Save this finding to the `scripts` table for future usage. Require sample extraction/snippet validation before promoting a selector to ACTIVE status, and store compatibility notes for mobile and desktop variants where the source differs by client platform.
**Acceptance criteria:**
- Script successfully connects to LLM, queries for selectors, and updates the database.
- Generated selectors are validated via sample extraction and can store client-platform compatibility notes.

### Step 3: Script Health and Availability Verification
**Objective:** Keep source scripts and non-live assets aligned with source changes.
**Prerequisites:** Step 2 completed.
**Artifacts to produce:**
- `agentic-research/agents/scripting/script_health_policy.yaml`
**Instruction:**
> Define `script_health_policy.yaml`. Require periodic review of non-live scripts, sample extraction checks to confirm source availability, and source-specific intelligence for blocking methods, proxy choices, and fingerprint management.
**Acceptance criteria:**
- The policy includes maintenance cadence, sample extraction checks, and source-intelligence fields.

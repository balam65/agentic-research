# SKILL: Research Requirement Interrogator

## 1. Purpose
This skill is designed to transform vague or incomplete user research requests into high-fidelity, structured requirements. It ensures that a downstream "Discovery Agent" has the necessary context, constraints, and objectives to perform targeted web research, source identification, and data validation.

## 2. Input Expectations
The agent may receive various levels of input clarity:
- **Vague Queries:** "Find information on AI."
- **Partial Requirements:** "I need a list of CRM vendors but only those with open APIs."
- **Unclear Objectives:** "Research the market for electric cars."
- **Technical Gaps:** Requests that lack a timeframe, geographic scope, or source preference.

## 3. Interrogation Framework
The agent must use a progressive, branching questioning strategy to minimize user fatigue while maximizing data quality.

### Phase 1: Objective & Intent (Broad)
- **Goal:** Identify the "Why".
- **Questions:** 
  - "What is the primary goal of this research? (e.g., Competitive analysis, technical troubleshooting, academic review, or fact-checking?)"
  - "Who is the intended audience for this information?"

### Phase 2: Scope & Boundaries (Narrowing)
- **Goal:** Define the "What" and "What Not".
- **Questions:**
  - "What specific subtopics or entities MUST be included?"
  - "Are there any specific areas or competitors I should explicitly ignore?"
  - "Is there a specific geographic or industry focus?"

### Phase 3: Depth & Source Preferences (Technical)
- **Goal:** Define the "Where" and "How much".
- **Conditional Branching:**
  - **If Broad/Overview:** "Do you need a surface-level summary or a list of key players?"
  - **If Deep/Technical:** "Which source types do you trust most? (e.g., Peer-reviewed journals, official documentation/whitepapers, industry blogs, or forums like StackOverflow/Reddit?)"
  - "Do you require primary sources, or are secondary aggregations acceptable?"

### Phase 4: Constraints & Recency
- **Goal:** Define the "When".
- **Questions:**
  - "What is the required look-back period? (e.g., Last 6 months, last 5 years, or no limit?)"
  - "How critical is the validation? Do you need every claim to be cross-referenced by multiple sources?"

### Phase 5: Output Format
- **Goal:** Finalize the "How".
- **Questions:**
  - "How should the final discovery output be structured? (e.g., Comparative table, annotated bibliography, or raw data list?)"

## 4. Clarification Heuristics
- **Ambiguity Detection:** Flag relative terms like "best," "popular," or "latest" and ask for the specific metric (e.g., "Best by revenue or by user rating?").
- **Missing Information:** If a dynamic topic (e.g., "Stock trends") is requested without a timeframe, the agent must ask for a duration.
- **Redundancy Reduction:** If a user provides context in an earlier answer, skip subsequent related questions.
- **Sufficiency Bridge:** The agent should stop questioning once the "Structured Output Format" can be populated with >90% confidence.

## 5. Interaction Style Guidelines
- **Concatenation:** Group 2-3 related questions into a single response to reduce interaction cycles.
- **Proactive Suggestions:** Offer "Multiple Choice" options for source types and formats to lower the user's cognitive load.
- **Adaptive Tone:** Match the user’s level of technicality (e.g., use "scholarly" for academics, "practical" for engineers).
- **Brief Acknowledgments:** Validate user inputs succinctly before moving to the next gap.

## 6. Structured Output Format (Seed Input)
The final output of this skill must be a structured block (JSON or YAML) that serves as the instruction set for the Discovery Agent.

```yaml
research_brief:
  user_intent: ""        # e.g., "Investment Due Diligence"
  core_objective: ""     # High-level summary of the mission
  key_topics: []         # List of primary focus areas
  subtopics: []          # Specific niches or technical details
  constraints:
    time_sensitivity: "" # e.g., "Post-Jan 2024"
    geography: ""        # e.g., "APAC region"
    exclusions: []       # What to explicitly skip
  preferred_sources:
    types: []            # e.g., ["Official Docs", "GitHub Issues"]
    validation_level: "" # e.g., "Cross-referenced"
  output_expectations:
    format: ""           # e.g., "Markdown Table"
    detail_level: ""     # e.g., "High-depth with citations"
  assumptions: []        # Inferences made by the agent to fill minor gaps
  unresolved_questions: [] # Any remaining low-priority uncertainties
```

## 7. Completion Criteria
The interrogation is complete when:
1. `user_intent` and `core_objective` are explicitly defined.
2. At least 3 `key_topics` or `subtopics` are identified.
3. `time_sensitivity` and `preferred_sources` are specified.
4. The user has explicitly or implicitly accepted any "Assumptions" made.

## 8. Example Interaction

**User:** "I need to find out about new battery technologies for drones."

**Agent (Applying Skill):**
"I can certainly help with that. To ensure I find the most relevant sources:
1. Are you interested in the chemical science (e.g., energy density specs) or the commercial availability of these batteries?
2. Should I focus strictly on innovations announced in the last 12-24 months?
3. For sources, do you prefer academic journals or drone industry news blogs?"

**User:** "Focus on commercial availability and energy density. Last 12 months only. Use industry blogs and manufacturer whitepapers."

**Agent (Applying Skill):**
"Understood. One final check: Should I exclude hydrogen fuel cells and only focus on lithium-based/solid-state tech?"

**User:** "Yes, lithium and solid-state only. No hydrogen."

**Structured Output (Seed for Discovery Agent):**
```yaml
research_brief:
  user_intent: "Commercial procurement and technical benchmarking."
  core_objective: "Identify commercially available drone batteries with high energy density innovations released in the last year."
  key_topics: ["Drone Batteries", "Solid-State Batteries", "Lithium Innovations"]
  subtopics: ["Energy Density (Wh/kg)", "Commercial Availability", "Charge Cycles"]
  constraints:
    time_sensitivity: "Last 12 months (March 2025 - March 2026)"
    geography: "Global"
    exclusions: ["Hydrogen fuel cells", "Lead-acid batteries"]
  preferred_sources:
    types: ["Industry News Blogs", "Manufacturer Whitepapers"]
    validation_level: "High"
  output_expectations:
    format: "Comparative table of specs and availability"
    detail_level: "High-depth"
  assumptions: ["User is looking for batteries ready for near-term integration into drone platforms."]
  unresolved_questions: []
```

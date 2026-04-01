# SKILL: Source Discovery & Deep Linking

## 1. Purpose
This skill enables an AI agent (the "Discovery Agent") to perform exhaustive web exploration and source pinpointing. It consumes a structured Research Brief (YAML) and produces a targeted map of high-authority sources and precise deep links for downstream data extraction.

## 2. Input Specification
The skill requires a structured YAML object as its single source of truth.
Example input structure:
```yaml
research_brief:
  user_intent: ""
  core_objective: ""
  key_topics: []
  subtopics: []
  constraints:
    time_sensitivity: ""
    geography: ""
    exclusions: []
  preferred_sources:
    types: []
    validation_level: ""
  output_expectations:
    format: ""
    detail_level: ""
  assumptions: []
  unresolved_questions: []
```

## 3. Discovery Workflow

### Phase 1: Strategic Search Expansion
- **Query Matrix:** Generate a matrix of search queries by intersecting `key_topics` with `subtopics`.
- **Constraint Injection:** Automatically append `after:YYYY-MM-DD` or geographic site modifiers (e.g., `site:.uk`) based on `constraints`.
- **Advanced Operators:** Utilize `filetype:pdf`, `intitle:`, and `inurl:` to find primary documents (whitepapers, reports) if requested in `preferred_sources`.

### Phase 2: Multi-Source Identification
- **Authority Filtering:** Cross-reference found domains against known high-authority databases (e.g., government portals, top-tier academic journals, industry leaders).
- **Source Triangulation:** If `validation_level` is high, the agent must find at least 3 independent sources confirming the same data points before inclusion.
- **Exclusion Enforcement:** Automatically filter out any domain or keyword present in the `exclusions` list.

### Phase 3: Recursive Exploration
- **In-Page Discovery:** For every high-value landing page, the agent must scan for internal links to deeper technical documentation or appendices.
- **Reference Following:** Extract bibliography or "further reading" links from identified sources to find "blind spot" documents.

## 4. Deep Linking Strategy
The Discovery Agent must go beyond high-level URLs to provide surgical access:
- **Anchor Pinpointing:** Append HTML anchors (e.g., `url#section-id`) to URLs to land the Extraction Agent exactly where the data starts.
- **PDF Page Indexing:** For PDF sources, identify and store specific page numbers (e.g., `url#page=12`).
- **Dynamic Content Mapping:** If data is behind a tab or interactive element, identify the specific state or UI path needed to reveal it.

## 5. Output Format: The Discovery Map
The final output must be a structured JSON/YAML object that acts as a SEED for the "Extraction Agent".

```yaml
discovery_map:
  header:
    source_count: 12
    primary_domains: ["arxiv.org", "nasa.gov"]
  source_list:
    - title: "Source Title"
      primary_url: "https://example.com/exhaustive-report"
      relevance_score: 0.95
      deep_links:
        - label: "Detailed Specifications Table"
          final_url: "https://example.com/exhaustive-report#specs-table"
          target_description: "Contains the raw energy density data requested."
          dom_selectors:
            xpath: "//table[@id='specs-table']"
            id: "specs-table"
            css: ".technical-specs > table"
        - label: "Appendix B: Methodology"
          final_url: "https://example.com/exhaustive-report/appendix-b"
          target_description: "Validates the testing conditions."
          dom_selectors:
            class_name: "methodology-section"
            xpath: "//div[contains(@class, 'methodology-section')]"
      metadata:
        published_on: "2024-05-12"
        source_type: "Technical Whitepaper"
```

## 6. Completion Criteria
The discovery phase is complete ONLY when:
1. Every `key_topic` from the input brief is covered by at least 2 distinct, high-authority sources.
2. At least 50% of sources include specific `deep_links` rather than generic landing pages.
3. No active `constraints` have been violated.
4. The `relevance_score` for all primary sources is above 0.8.

## 7. Example Execution

**Input Snippet:**
`key_topics: ["Solid-State Battery"]`
`subtopics: ["Anode-free designs", "Cycle life"]`
`preferred_sources: ["Academic Publications"]`

**Discovery Steps:**
1. `google_search('site:scholar.google.com "anode-free" solid-state battery')`
2. `google_search('intitle:"cycle life" "solid-state battery" filetype:pdf')`
3. Identify paper: "Long-cycle life anode-free solid-state batteries" on Nature.com.
4. Locate Table 2 (Cycle data) and generate anchor link.

**Final Item in Map:**
`- title: "Nature Paper: Anode-free Progress"`
  `primary_url: "https://nature.com/articles/s41586-024-..."`
  `deep_links:`
    - label: "Table 2: Performance metrics"
      final_url: "https://nature.com/articles/s41586-024-...#Tab2"
      dom_selectors:
        xpath: "//div[@id='Tab2_content']"
        id: "Tab2_content"
        css: "figure#Tab2"

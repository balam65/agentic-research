# SKILL: Extraction Orchestration

## 1. Purpose
This skill enables an AI agent (the "Orchestration Agent") to manage the data extraction phase of the research pipeline. It consumes the "Discovery Map" from the previous stage, selects the most efficient extraction tools, and executes the process to produce clean, structured data for final synthesis.

## 2. Input Specification
The skill consumes the structured YAML output from the Discovery Skill. This input acts as the "Orchestration Blueprint".

```yaml
discovery_summary:
  interpreted_intent: ""
  coverage_status: ""
  gaps_identified: []

sources:
  - topic: ""
    subtopic: ""
    source_type: "" # e.g., "Static HTML", "SPA", "PDF", "API"
    title: ""
    url: ""
    deep_links:
      - section_title: ""
        url: ""
        dom_selectors: # Specific seeds for precise extraction
          xpath: ""
          id: ""
          css: ""
          class_name: ""
    relevance_score: 0.0
    notes: ""

coverage_map:
  key_topics_covered: []
  subtopics_covered: []
  missing_areas: []

recommended_start_points:
  - description: ""
    url: ""
```

## 3. Tool Selection Logic
The Orchestration Agent must automatically map the `source_type` and `dom_selectors` to the optimal technical tool:

| Source Profile | Recommended Tooling | Execution Logic |
| :--- | :--- | :--- |
| **Basic Article / Blog** | `read_url_content` | Quick Markdown conversion; ideal for high-volume text. |
| **Complex Table / SPA** | `read_browser_page` | Headless navigation; allows for waiting for JS-rendered elements. |
| **PDF Technical Report** | `pdf_reader` / `view_file` | Targeted page extraction based on deep link metadata. |
| **Known Data Element** | `execute_script` | Uses `getElementById` or `XPath` for surgical extraction if seeds are present. |

## 4. Extraction Framework

### Phase 1: Initialization
- **Run ID Generation:** Create a unique directory for the current session: `/data/runs/[run-date-id]/`.
- **Parallelization Strategy:** Batch sources by domain to avoid overwhelming a single host.

### Phase 2: Directed Extraction
- **Selector Verification:** Before extraction, verify if `dom_selectors` lead to valid content.
- **Fallback Mechanism:** If a specific ID or Class is missing, fall back to "Semantic Extraction" (reading the full page and filtering via focus-on-topic).
- **Rate-Limit Compliance:** Inject pseudo-random delays (1-3s) between sequential requests to the same domain.

### Phase 3: Data Structuring
- **Standardization:** Map raw extracted text into defined JSON fields (e.g., `date`, `value`, `unit`, `claim`).
- **Citation Linking:** Every data point MUST retain a reference to its source `url` and `run_id`.

## 5. Perseverance & Error Handling
- **The "Three-Strike" Rule:** If a source fails 3 times due to timeouts or errors, move it to `missing_areas` and log the error code.
- **Bot Detection Mitigation:** If a "CAPTCHA" or "Access Denied" is detected, pause the domain for 10 minutes or switch search domains.

## 6. Persistence & Serialization
The final output is saved as an `extraction_data.json` file in the predefined run directory.

```json
{
  "extraction_session": {
    "run_id": "2024-03-18-BATT-01",
    "status": "Completed",
    "records": [
      {
        "source_title": "QuantumScape technical results 2024",
        "data_points": [
          {
            "topic": "Energy Density",
            "extracted_value": "450 Wh/kg",
            "context": "Performance under room temperature testing",
            "source_anchor": "https://qs.com/report#page=4",
            "verification_xpath": "//div[@id='performance-specs']"
          }
        ]
      }
    ]
  }
}
```

## 7. Completion Criteria
The orchestration phase is considered complete when:
1. >90% of `sources` marked as "High Relevance" have been successfully processed.
2. The `extraction_data.json` file is syntactically valid and non-empty.
3. All `missing_areas` have been updated with failure reasons for the next stage's review.

## 8. Example Execution

**Scenario:** Extracting a specific price from a competitor site.

1. **Input:** URL: `example.com/pricing`, ID: `pro-plan-price`.
2. **Action:** `run_browser_action` -> Navigate to URL -> `getElementById('pro-plan-price')`.
3. **Capture:** "99.99".
4. **Transform:** `{"price": 99.99, "currency": "USD", "plan": "Pro"}`.
5. **Persist:** Write to `/data/runs/2024-03-18/results.json`.

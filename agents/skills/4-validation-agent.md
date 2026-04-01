# SKILL: Data Validation & Quality Assurance

## 1. Purpose
This skill enables an AI agent (the "Validation Agent") to audit, verify, and maintain the quality of extracted research data. It acts as the final gatekeeper in the research pipeline, ensuring that all data points are accurate, consistent, and reliable before they are consumed for synthesis or decision-making.

## 2. Input Specification
The skill consumes the structured output from the Stage 3 (Orchestration & Extraction) phase.

```yaml
data_package:
  run_id: "SESSION-YYYY-MM-DD-ID"
  extracted_records:
    - record_id: "REC-01"
      source_ref: "Source Title"
      topic: "Core Topic"
      fields:
        key: "value" # e.g., "energy_density": "450 Wh/kg"
      metadata:
        url: "https://example.com/source"
        extracted_at: "2024-03-18T12:00:00Z"
        method: "read_browser_page"
  schema:
    fields:
      - name: "string"
        type: "string"
        description: "string"
  storage:
    format: "json"
    location: "/path/to/data"
```

## 3. Validation Framework

### Phase 1: Structural & Schema Integrity
- **Type Enforcement:** Confirm that numeric fields (e.g., `price`, `weight`) contain valid numbers and expected units.
- **Mandatory Field Check:** Flag any record missing "Must-Have" fields defined in the `schema`.
- **Deduplication:** Identify and merge records that originated from different deep links within the same primary domain.

### Phase 2: Logic & Consistency Checks
- **Out-of-Bounds Detection:** Flag values that fall outside of realistic ranges for the domain (e.g., "150% efficiency" or "Free" when previously listed as "Premium").
- **Historical Benchmarking:** Compare current values against existing Knowledge Items (KIs) or previous research runs to detect sudden, unverified shifts in data.
- **Internal Alignment:** Ensure logically dependent fields align (e.g., "Start Date" < "End Date").

### Phase 3: Reliability & Source Triangulation
- **Source Authority Scoring:** Assign higher weights to data from high-authority sources (e.g., Peer-reviewed journals, official government documentation).
- **Consensus Building:** Mark a claim as "High Confidence" only if corroborated by at least 2 independent, non-affiliated sources.
- **Conflict Identification:** Explicitly flag cases where two or more high-authority sources provide contradictory values for the same metric.

## 4. Confidence & Reliability Scoring
Every record must be assigned a `quality_score` (0.0 - 1.0) based on:
- **Source Trust:** (Weight 0.5) Based on domain type (.gov, .edu vs .com).
- **Corroboration Level:** (Weight 0.3) Number of distinct sources confirming the data.
- **Data Clarity:** (Weight 0.2) Cleanliness of the extracted strings and pattern compliance.

## 5. Conflict Resolution Strategies
The Validation Agent must apply one of the following strategies when source conflicts arise:
- **Highest Authority:** Default to the value from the source with the highest trust score.
- **Latest Timestamp:** Default to the most recently updated or published source.
- **Inclusive Flagging:** Retain all conflicting values but move the record into a "Needs Human Audit" category.

## 6. Output Format: The Validated Dataset
The final output is a `validated_dataset.json` and a `quality_report.md`.

```json
{
  "validation_run": {
    "run_id": "2024-03-18-AUDIT-01",
    "metrics": { "total_verified": 85, "conflicts_flagged": 5, "accuracy_score": 0.92 },
    "records": [
      {
        "record_id": "REC-01",
        "topic": "Energy Density",
        "final_value": "450 Wh/kg",
        "confidence": 0.98,
        "status": "Verified",
        "verification_sources": ["nature.com", "doe.gov"],
        "audit_notes": "Data confirmed by two top-tier technical sources; no conflicting data points found."
      }
    ]
  }
}
```

## 7. Completion Criteria
Validation is considered complete when:
1. All records in the `extracted_records` list have been audited.
2. Every `record` has an assigned `confidence` score and `status`.
3. The `conflicts_flagged` list is fully populated with specific reasons for discrepancy.
4. The `validated_dataset.json` is saved to the specified `storage.location`.

## 8. Example Execution

**Scenario:** Validating a SaaS price that varies across review sites and the official page.

1. **Extraction Data:** Source A (Review site) says $10/mo. Source B (Official) says $15/mo.
2. **Action:** Apply "Highest Authority" strategy.
3. **Outcome:** Official page ($15/mo) is prioritized. 
4. **Log:** "Conflict detected between Review Site and Official; Official page selected as primary truth. Review site marked as outdated."
5. **Score:** Record assigned 1.0 Source Trust and 0.95 overall confidence.

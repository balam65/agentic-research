# 05 — Transformation & QA Analysis

> **Objective:** Bridge the gap between the raw extracted payload (unstructured DOM fields, messy APIs) and the strict schema required by the client. Establish the confidence thresholds and validation rules for the Validation output phase.

---

## 1. Schema Gap Analysis

### 1.1 Source vs. Target Mapping

Compare the structure observed in the target vs the `research_brief` target schema requested from Doc 01:

| Expected Schema Field | Raw Source Equivalent | Transformation Required | Complexity |
|---|---|---|---|
| `flight.date_utc` | `"Sat, 14 Aug 25"` | `strptime` format parsing -> ISO8601 UTC | Low |
| `ancillary.baggage.price_usd` | `$25.00` | Regex digit extraction, float cast | Low |
| `policy.cancellation` | Massive unstructured text | LLM feature extraction/summarization | High |
| `fare_class` | `"Y-class / Opt 1"` | Dictionary mapping to standard codes | Medium |

### 1.2 "Missing Field" Resolution Strategy

If a requested field is *not* present in the target payload:

1. **Calculated Field:** Can we derive it? (E.g., `net_fare = total_price - taxes`)
2. **Hardcoded Fallback:** E.g., `source_system: "Web"`
3. **Escalation Trigger:** The target schema requires it, but the source explicitly hides it. Must flag down `research_brief` for an SLA modification.

---

## 2. Validation Constraints Definition

### 2.1 Logical Rules & Datatype Assertions

For each field defined above, what is the exact validation rule?

| Target Field | Datatype | Required? | Logical Bound | Failure Consequence |
|---|---|---|---|---|
| `total_price` | Float | Yes | `> 0`, `< 10000` | Flag: Critical Data Error |
| `flight_number` | String | Yes | Regex `^[A-Z]{2}\d{1,4}$` | Warning: Nullify Field |
| `departure_date` | ISO8601 | Yes | `> Current Date` | Flag: Silent Error Loop |

### 2.2 Relational Consistency

QA isn't just checking rows; it's evaluating internal logic.

- **Check 1:** `departure_date` must legally be before `arrival_date`.
- **Check 2:** If `baggage.is_included == false`, then `baggage.price_usd` must exist.
- **Check 3:** The sum of `tax_breakdown` must equal `aggregate_tax`.

> [!CAUTION]
> Inconsistent data structures (where math doesn't sum) are the fastest way to lose client trust in the Agentic Research Pipeline. If the source data's math is wrong, we must flag it proactively before transformation.

---

## 3. Confidence Scoring Baseline

The QA Agent scores every single payload delivered using the following formula:

| Metric | Condition | Confidence Drop |
|---|---|---|
| Required Fields Null | `price_usd == null` | `-0.20` |
| Fallback Used | Extracted LLM data instead of regex | `-0.10` |
| Bounding Edge | Value equals extreme edge of logical bounds (`$0.01`) | `-0.05` |

**Payload Grading Scale:**
- `0.90 - 1.00`: Excellent, Pass to Delivery.
- `0.70 - 0.89`: Valid but degraded, Pass with warnings.
- `< 0.70`: Invalid, Send to Sentinel Failure Queue for re-extraction.

---

## 4. Metadata Handover

| Consumer | What They Need | From This Doc |
|---|---|---|
| **Transformation Agent** | Format parsing logic, regex, dictionary maps, LLM prompt fallback | Section 1 |
| **QA/Validation Agent** | Datatype assertions, relational rules, confidence math | Section 2, 3 |
| **Delivery Agent** | Expected final schema form and required delivery filetypes | Section 1, 2 |

---

## 5. Analysis Checklist

- [ ] Complete Source-to-Target mapping established
- [ ] Transformation methods (Regex/Python/LLM) explicitly defined
- [ ] Logical bounds defined for all critical numerical/date columns
- [ ] Payload relational consistency checks mapped
- [ ] **Domain readiness score assigned (1–5)**

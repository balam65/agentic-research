# Non-Negotiable I/O Contract

In accordance with the Agentic Factory design and Justin's guidance, the agentic-research system must be modeled around what *must* go in and what *must* come out. Intermediate artifacts (like structured research briefs or pipeline stages) are no longer mandated at the top-level contract. The capability layer will determine independently when such intermediate artifacts are required for Human-in-the-Loop validations.

## 1. Top-Level Input (The Requirement)

The system MUST receive an unambiguous specification representing the research target and constraints.
- `target_domain` (e.g., healthcare providers, compliance frameworks)
- `extracted_schema_definition` (The desired output format, fields, and types)
- `budget_or_time_constraints` (e.g., limit of 1000 pages or 1 hour of compute)

## 2. Top-Level Output (The Delivery)

The system MUST produce the following validated data block.
- `validated_data`: The final extracted information matching the `extracted_schema_definition`.
- `traceability_log`: The rationale, source URLs, and timestamps of data capture.
- `confidence_score`: A system-level score reflecting the certainty of the final deliverable.

Everything else between Input and Output is the Agentic Factory's internal process and is determined by the Intelligence Layer dynamically assembling capabilities.

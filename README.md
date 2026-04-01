# Agentic Research

A full life-cycle agentic data acquisition and delivery pipeline designed to automate and scale intelligent data production workflows.

## Overview

The `agentic-research` project is a comprehensive infrastructure implementation for an agentic data production workflow. It merges deep research capabilities—such as interrogation, discovery, orchestration, and validation—with an end-to-end operational process. 

The system is designed as a multi-agent ecosystem where specialized AI agents handle distinct phases of the data lifecycle, from initial requirement assessment to secure data delivery and ongoing monitoring.

## Architecture & Phases

The pipeline is organized into a robust, sequenced architecture governed by a central Master Agent:

* **Phase 0: Orchestration & Governance**
  * **Master Agent:** Operates as the central control system, ensuring the agent ecosystem is scalable, reliable, and sequenced efficiently.
  * **Compliance & Security Agent:** Enforces rules to validate system access globally, manage credentials, and audit risk.

* **Phase 1: Requirement & Assessment**
  * **Assessment & Interrogation Agent:** Responsible for multimodal ingestion. It derives intent via direct conversation, parsing requirement docs, or analyzing legacy processes to generate standardized research briefs.
  * **Scheduling Agent:** Manages queueing and enforces SLA constraints before passing tasks downstream.

* **Phase 2: Deep Research & Onboarding**
  * **Discovery & Sub-Source Mapping Agent:** Handles conditional fast-tracking, checking pre-built libraries, and mapping unknown sources via specialist deep linking.
  * **Onboarding & Specialist SME Agent:** Conducts feasibility checks and configures evasion strategies for complex sources.
  * **Scripting Agent:** Develops the necessary data extraction scripts and manages the script repository.

* **Phase 3: Production & Data Capture**
  * **Extraction & Orchestration Agent:** Selects appropriate tooling (e.g., SPA, PDF extraction) and executes run logic using the Phase 2 scripts.
  * **Production & Scaling Agent:** Manages dynamic cloud scaling, proxy rotation, and retry logic for robust payload capture.

* **Phase 4: Transformation & Validation**
  * **Transformation Agent:** Formats raw extracted payloads into customized client schemas (e.g., CSV, JSON, API mapping).
  * **QA & Validation Agent:** Cross-references data, performs schema checks, assigns trust/confidence scores, and flags logic or range conflicts.

* **Phase 5: Delivery, Support & Monitoring**
  * **Delivery Agent:** Pushes the validated and structured data via secure delivery methods like SFTP or API endpoints.
  * **Sentinel Monitoring Agent:** Continuously monitors system health, failure detection, SLA latency, and run tracking to prevent queue bottlenecks.
  * **Support Agent:** Handles internal and external helpdesk queries, communications, and ensures compliance with data exposure laws.

## Documentation

For detailed technical specifications and agent-ready instructions for each pipeline phase, refer to the [`docs/implementation`](./docs/implementation/) directory.

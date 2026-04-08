# Gap Analysis: Agentic Data Production Pipeline

## 1. Current State vs Target State

| Dimension | Current State | Target State |
| --- | --- | --- |
| **Outcome Clarity** | Clear pipeline architecture defined (Phases 0-5). | End-to-end execution flow moving payload autonomously from ingestion to delivery. |
| **Process Readiness** | Upstream ingestion and downstream QA/Delivery workflows are modelled via n8n. | End-to-end execution of a real workload. |
| **Technical Readiness** | Phase 3 (Extraction engine & Scaling) is unbuilt (`orchestrator_node.py` missing). | fully operational Python scripts routing inputs, handling headless browsers, and managing proxies. |
| **Data & Memory** | Target registry and audit logging exist. | Staging storage for raw payloads during extraction and state locking across distributed nodes. |

## 2. Confirmed Gaps
- **Extraction Routing Logic:** No working mechanism to route extraction workloads to specific toolsets (BrowserAdapter vs HTTPAdapter). 
- **Production Infrastructure Setup:** Proxy rotation (`proxy_rotator.py`), distributed node locks, and scaling mechanisms (`scale_manager.py`) are missing.
- **Retry Mechanisms:** Exponential backoff and SLA tracking for individual extraction jobs is missing.
- **Machine Run Contract:** Extractors lack output staging endpoints and clean exit signaling.

## 3. Assumptions
- **Proxy Pool Integrity:** Assuming the proxy pool can handle dynamic evasions (Cloudflare, etc.) without exhausting the budget.
- **Downstream Readiness:** Assuming the Phase 4 schemas and Phase 5 QA loops can parse the raw unified JSON planned for Phase 3.

## 4. Risks & Unknowns
- **Distributed Locking:** Concurrent execution of extraction tasks runs the risk of duplicating extracts without proper state locks.
- **Hardware Bottlenecks:** Headless browsers (SPA extraction) may overwhelm the nodes before scaling mechanisms can adapt.

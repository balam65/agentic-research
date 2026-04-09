# Implementation Plan: Phase 3 (Production & Extraction)

## 1. Phased Work (Immediate / Soon / Later)

### Immediate Horizon (Next 1 Week)
*Focus: Tool Routing & Core Extraction.*
1. **Develop `orchestrator_node.py`:** Implement the `route_extraction(source)` function to categorize `source_type` into SPA, Static HTML, or PDF.
2. **Develop `extraction_adapters.py`:** Create class interfaces for `BrowserAdapter` and `HTTPAdapter` that accept URLs/selectors and output unified JSON. 
3. **Define `runtime_contract.yaml`:** Standardize extraction node start up arguments and termination signaling.

### Soon Horizon (Weeks 2-3)
*Focus: Scaling, Resilience & Validation.*
1. **Develop `proxy_rotator.py`:** Integrate Vault Manager and write `get_next_proxy(domain)` to cycle IP addresses without breaching rate limits.
2. **Develop `scale_manager.py`:** Implement the Three-Strike exponential backoff rule and call-consumption tracking.
3. **Perform End-to-End Dry Run:** Push a dummy payload through Phase 0 -> 5 to ensure payloads pass without structural breaks. 

### Later Horizon
*Focus: Cost Optimization & Deep Evasion.*
1. Deep evasion profiles for difficult sources.
2. Cloud scale elasticity tuning based on RAM/CPU bounds.

## 2. Dependencies
- **Phase 2 Outputs:** Requires complete `discovery_map` YAML and script repository implementations to test extraction logic.
- **Compliance Rules:** `proxy_rotator.py` depends on credentials leased from the Compliance Agent (Phase 0).

## 3. Acceptance Criteria (Definition of Done)
- **Unit Level:** Proxies rotate successfully without rate limiting. Adapters successfully return structured JSON.
- **System Level:** The orchestrator successfully parses a Phase 2 brief, scales appropriately, scrapes target, retries on 503s, and pushes data to Phase 4.

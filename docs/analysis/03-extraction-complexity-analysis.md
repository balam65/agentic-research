# 03 — Extraction Complexity Analysis

> **Objective:** Evaluate the technical difficulty of building and maintaining an extraction script for the discovered target. This determines the development effort (Scripting Agent time) and compute cost required per execution.

---

## 1. DOM/API Structure Complexity

### 1.1 Endpoint Classification

Based on Discovery (Doc 02), analyze the chosen extraction vector:

| Metric | Description | Complexity Score |
|---|---|---|
| Target Format | JSON / XML / HTML / PDF / Image | JSON=Low, Image/PDF=High |
| Payload nesting | Depth of target data within JSON tree / DOM depth | 1 (Shallow) to 5 (Deeply nested arrays) |
| Pagination Method | Standard query params, infinite scrolling, or cursor-based | Query=Low, Infinite Scroll=High |
| State Management | Does the target require multi-step state generation? (E.g., Search -> Select -> View Price) | Yes=High, No=Low |

### 1.2 Data Availability Constraints

| Check | Result | Tool Selection Change |
|---|---|---|
| Rendered Client-Side? | Yes/No | If Yes, must use Headless Browser (Playwright/Puppeteer) |
| Asynchronous Loading? | Yes/No | If Yes, require explicit wait states in Scripting logic |
| iframe encapsulation? | Yes/No | If Yes, requires context switching in Headless Browser |
| Shadow DOM usage? | Yes/No | If Yes, requires deep piercing CSS selectors |

---

## 2. Maintenance & Fragility Assessment

### 2.1 DOM Volatility History

Does the site have a history of frequent, layout-breaking deployments? Evaluate using archive tools or known industry standards.

- **High Volatility:** Aggregators, heavily A/B tested booking flows (e.g., major OTAs). Requires self-healing element locators and robust QA fallback logic.
- **Low Volatility:** Legacy government registries or B2B portals. Standard XPath queries can safely persist for months.

### 2.2 Extraction fragility Flags

| Flag | Condition | Impact |
|---|---|---|
| A/B Testing Detected | Multiple DOM structures served unpredictably | Script must handle multiple conditional paths |
| Obfuscated Text | Prices rendered as images or mixed via CSS (`direction: rtl`) | OCR or advanced CSS parsing required |
| Ephemeral Tokens | Required search tokens expire mid-scrape | Script must catch token death and auto-refresh |

---

## 3. Recommended Script Architecture

Based on the complexity above, recommend the exact execution toolset.

### 3.1 Scripting Blueprint

| Decision Area | Selected Stack | Rationale |
|---|---|---|
| **Engine** | Axios + Cheerio vs. Playwright | Playwright chosen due to heavy shadow DOM implementation |
| **Concurrency** | Asynchronous workers vs Synchronous queue | Target allows 50 concurrent connections; Async chosen |
| **Error Handling** | Linear retries vs Token Refresh cycles | Token expiration happens randomly; implementing a refresh trap |

> [!IMPORTANT]
> The Scripting Agent uses this blueprint to draft the `.py` or `.js` file exactly to spec. Supplying incorrect architectural decisions here results in an infinite crash-loop when deployed to Production nodes.

---

## 4. Metadata for Agentic Research

This analysis produces metadata consumed directly by the Scripting Agent.

| Consumer | What They Need | From This Doc |
|---|---|---|
| **Scripting Agent** | Target tool stack, pagination logic, wait-states | Section 1, 3 |
| **QA Validation** | Expected fragility locations, known breaking points | Section 2 |
| **Production Scaling** | Whether to load heavy browsers vs lightweight HTTP clients | Section 3 |

---

## 5. Analysis Checklist

- [ ] Target data format and payload nesting mapped
- [ ] Client-side rendering and async loading requirements determined
- [ ] Volatility and fragility risks documented
- [ ] Appropriate extraction engine (HTTP vs Browser) selected
- [ ] **Domain readiness score assigned (1–5)**

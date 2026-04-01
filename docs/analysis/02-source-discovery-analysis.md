# 02 — Source Discovery Analysis

> **Objective:** Map the target domain's available endpoints, bypass paths, and anti-bot landscape. Before writing any scraping logic, the Discovery phase defines *where* the data lives and *how hard* it is to reach.

---

## 1. Sub-Source Domain Mapping

### 1.1 Feasibility & API Interrogation

For the requested base domain (e.g., an airline's booking site):

| Discovery Target | Status | Notes / Links |
|---|---|---|
| Native API | Open / Closed | Publicly documented APIs (e.g., developer portals) |
| Undocumented Fetch/XHR | Found / Hidden | API calls traced via browser console during standard booking flows |
| Deep-Link Availability | Yes / No | Can we bypass the homepage and hit a results page directly? |
| Mobile App Traffic | Intercepted / Encrypted | Endpoints utilized by the iOS/Android applications |

### 1.2 "Fast-Track" Library Assessment

Before spending hours analyzing DOMs, we cross-reference internal script libraries.

- **Pre-existing Integration:** Is this domain already mapped? (Y/N)
- **Known Partner Source:** Does this target syndicate data to an aggregator we already have access to? (E.g., mapping Kayak to find a specific airline's route).
- **Specialist SME Required:** (Y/N) If it requires complex CAPTCHA bypass or aviation/travel specific GDS (Global Distribution System) knowledge.

> [!TIP]
> **Conditional fast-tracking:** If a target's mobile application endpoint is unencrypted, prioritize it. Mobile APIs frequently lack the heavy Cloudflare/Akamai web-defenses found on browser endpoints.

---

## 2. Evasion & Defense Profiling

### 2.1 Anti-Bot Analysis Matrix

Evaluate the target's defensive posture:

| Defense Component | Evaluation | Extraction Implication |
|---|---|---|
| WAF Provider | Akamai / Cloudflare / Datadome / Custom | Defines proxy rotation / header spoofing needs |
| Behavioral Scripts | None / Mouse Tracking / Canvas Fingerprinting | Requires headless browser vs standard request |
| CAPTCHA Frequency | Never / Per Session / Rate-Limited | Introduces latency and manual solving costs |
| Token Expirations | JWT / Session Cookies / 5-min CSRF | Defines authentication refresh cycles |

### 2.2 Domain Risk Flags

| Flag | Condition | Impact |
|---|---|---|
| Legal Ban (robots.txt) | Explicitly prevents scraping in requested directories | Compliance review required |
| Dynamic Classes (CSS) | DOM class names change on every refresh (`<div class="x-38A2D">`) | XPATH-based scripts will fail |
| IP Geofencing | Only allows traffic from specific countries | Requires geo-specific proxy pools |

---

## 3. Sub-Source Readiness Output

This analysis outputs the architectural metadata necessary for the Scripting Agent.

| Metric | Source |
|---|---|
| Approach Recommendation | Native API / Hidden API / Headless Browser / OCR |
| Defense Profile Level | 1 (None) to 5 (Military Grade) |
| Deep Links Discovered | Array of URL structures (e.g., `domain.com/search?orig={orig}&dest={dest}`) |

### 3.1 Metadata Handover

| Consumer | What They Need | Doc Reference |
|---|---|---|
| **Scripting Agent** | Endpoints, required headers, CAPTCHA strategy | Section 1, 2 |
| **Onboarding SME** | If target is extremely difficult, escalates for human intervention | Section 1.2 |
| **Phase 03 Complexity** | The proxy profile | Section 2 |

---

## 4. Analysis Checklist

- [ ] Target domain mapped for hidden APIs
- [ ] Alternative sources (Mobile, Aggregators) evaluated 
- [ ] Anti-bot provider identified
- [ ] Evasion requirements explicitly defined (Headers, IPs, Behavioral)
- [ ] **Domain readiness score assigned (1–5)**

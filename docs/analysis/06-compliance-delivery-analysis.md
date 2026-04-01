# 06 — Compliance & Delivery Analysis

> **Objective:** Assure the data extraction process meets all legal, privacy, and security constraints required by both the target platform and the client's destination. Finalize the secure routing mechanics.

---

## 1. Compliance Risk Matrix

### 1.1 Credential & Context Security

Does the extraction require authentication?

| Authentication Need | Mechanism | Security Standard Required |
|---|---|---|
| B2B / API Access | API Keys, OAuth | 256-bit AES Vault, No cleartext logging |
| Consumer Portal Access | Username/Password | Session isolation, automated secure injection |
| Browser Fingerprinting | Heavy Cookies | No persistence of cookies across different target clients |

### 1.2 PII & Data Privacy Exposure

What happens if the scraped data inadvertently captures restricted information?

| Legal Standard | Relevant If Extracting... | Mitigation Action in Pipeline |
|---|---|---|
| **GDPR / CCPA** | Passenger names, loyalty account data, addresses | Immediate regex masking in Transformation Phase. NEVER write raw PII to disk. |
| **PCI-DSS** | Last 4 digits of credit card, billing zips (e.g., inside an airline portal) | Transform to `***-XXXX`, drop field before QA boundary. |

> [!WARNING]
> If the `research_brief` explicitly requests PII data (e.g., a registry scrape) that violates our internal Data Handling Policies, the Master Agent must immediately reject the task and halt execution.

---

## 2. SLA & Rate-Limit Governance

### 2.1 Target Aggression Policy

Even if the [Production Scales (04)](04-production-scaling-analysis.md) allow high throughput, aggressive scraping violates Fair Use principles and risks massive WAF bans.

- **Politeness Delay Defined:** Minimum ms delay between synchronous requests from the same IP namespace (e.g., 500ms).
- **Robots.txt Adherence:**
  - Are we ignoring `robots.txt`? (Yes/No)
  - If Yes, explicit `Legal Hold Waiver` must be attached to the target config.

### 2.2 Client SLA Verification

| Metric | Client Requested | Guaranteed Delivery SLA |
|---|---|---|
| **Velocity** | Every 6 hours | Every 8 hours (with 2 hr QA buffer) |
| **Completeness** | 100% of Origin nodes | 95% guaranteed yield (allow for organic 5% target timeouts) |

---

## 3. Delivery Destinations

Map exactly how the successfully validated payload leaves the Agentic OS ecosystem.

| Delivery Format | Route | Configuration Checks |
|---|---|---|
| JSON API Push | `POST https://client.api.com/ingest` | JWT Auth configured, Webhook failure retry set |
| Batch CSV / SFTP | `sftp://b2b.client.net/drop/` | Valid `id_rsa`, public key whitelisted |
| File Storage (AWS S3) | `s3://agentic-research-client/out` | IAM Role assumed, Buckets configured |

---

## 4. Metadata Handover

This document feeds the final legs of the journey: security layers and delivery pipelines.

| Consumer | What They Need | From This Doc |
|---|---|---|
| **Compliance Agent** | Masking rules (Regex), PII warnings, rate limiting bounds | Section 1, 2 |
| **Delivery Agent** | Final destination routing logic, authentication | Section 3 |
| **Support Agent** | Escalation paths if the SLA is continuously breached | Section 2 |

---

## 5. Analysis Checklist

- [ ] Privacy constraints (GDPR/PII/PCI) evaluated for the target data
- [ ] Safe "Politeness" boundaries configured
- [ ] Robots.txt Legal Hold Waivers assessed
- [ ] Outbound delivery credentials securely validated
- [ ] **Domain readiness score assigned (1–5)**

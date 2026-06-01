# Security & Compliance

**Product:** Nullify AI  
**Version:** 1.0 (MVP)  
**Last Updated:** May 2026

---

## Overview

Nullify AI operates at the intersection of AI infrastructure and regulated-industry decision-making. Every decision routed through Nullify may contain sensitive patient health information, financial records, or PII. This document describes the security architecture, compliance posture, and threat model for the Nullify platform.

---

## Regulatory Compliance Posture

### EU AI Act (Effective August 2026)

Nullify is specifically designed to help enterprises meet EU AI Act requirements for high-risk AI systems. Under the Act, operators of high-risk AI systems must:

**Article 9 — Risk Management System**
Operators must establish, implement, document, and maintain a risk management system throughout the AI system lifecycle. Nullify's rule evaluation engine and behavioral baseline directly address this requirement by providing continuous, automated risk assessment at the decision level.

**Article 12 — Record-Keeping**
High-risk AI systems must automatically log every decision with sufficient detail for post-hoc review. Nullify's immutable audit logger captures the full decision context, rule evaluation results, verdict, and timestamp for every decision — in a format specifically designed for regulatory export.

**Article 13 — Transparency**
Decisions made by high-risk AI systems must be interpretable by overseers. Every Nullify verdict includes a plain-language explanation of what rule triggered and why, satisfying transparency requirements without burdening the AI agent itself.

**Article 14 — Human Oversight**
High-risk systems must allow human oversight and intervention. Nullify's ESCALATED verdict type and review queue infrastructure directly implement human-in-the-loop pathways.

**Article 15 — Accuracy, Robustness, Cybersecurity**
AI systems must be monitored for accuracy degradation over time. Nullify's behavioral baseline ML and drift scoring provide continuous accuracy and robustness monitoring.

**Data Residency:** Nullify operates EU-region nodes (eu-west-1) to ensure data from EU AI Act-scoped workloads never leaves EU jurisdiction. EU tenants are provisioned on EU nodes by default.

---

### HIPAA Compliance

Nullify processes Protected Health Information (PHI) when deployed in healthcare workflows (prior authorization, claims processing). The platform is designed to support HIPAA compliance:

**Business Associate Agreement (BAA)**
Nullify offers BAAs to all healthcare customers. A signed BAA is required before any PHI is routed through the platform. BAAs are available at the Enterprise tier.

**Minimum Necessary Standard**
The Nullify intercept layer processes only the decision payload passed by the AI agent. It does not pull additional patient records beyond what is required for rule evaluation. Context hydration is scoped to the specific fields referenced in active rules.

**Audit Controls (§ 164.312(b))**
Nullify's immutable audit logger maintains a complete, tamper-evident record of all decisions involving PHI. Logs are retained for 7 years (configurable to meet state-specific requirements beyond the federal 6-year minimum).

**Transmission Security (§ 164.312(e)(1))**
All data in transit is encrypted using TLS 1.3. PHI payloads are never transmitted over unencrypted channels. API keys are required for all connections.

**Integrity Controls (§ 164.312(c)(1))**
Audit logs are cryptographically signed (HMAC-SHA256) at write time. Any tampering with log records is detectable.

---

### SOC 2 Type II (Target: Q4 2026)

Nullify is pursuing SOC 2 Type II certification covering the following Trust Services Criteria:

| Criteria | Coverage |
|----------|----------|
| CC6 — Logical and Physical Access Controls | API key authentication, RBAC (v1.1), network isolation |
| CC7 — System Operations | Monitoring, incident response, drift alerts |
| CC8 — Change Management | Deployment pipeline, rule versioning, immutable audit trail |
| CC9 — Risk Mitigation | Failover modes, redundancy, threat model |
| A1 — Availability | 99.9% SLA, multi-region deployment, automated failover |
| C1 — Confidentiality | Encryption at rest and in transit, tenant isolation |
| P1–P8 — Privacy | PHI handling, data residency, retention policies |

**Current status:** SOC 2 Type I controls implemented. Type II audit observation period begins Q3 2026.

---

## Encryption

### In Transit
- **Protocol:** TLS 1.3 (minimum TLS 1.2 accepted for legacy integrations, deprecated Q3 2026)
- **Certificate authority:** Let's Encrypt (auto-renewed)
- **HSTS:** Enforced with preload for all API endpoints
- **Internal traffic:** mTLS between all internal services (API Gateway → Rule Evaluator → Audit Logger)

### At Rest
- **Audit store (S3):** AES-256 server-side encryption (SSE-S3), KMS customer-managed keys for Enterprise tier
- **Rules database (PostgreSQL):** AES-256 encryption via AWS RDS encryption
- **Baseline store (TimescaleDB):** Encrypted at volume level
- **API keys:** Stored as bcrypt hashes. Plaintext is only returned once at creation time.

### Key Management
- Customer-managed KMS keys available for Enterprise customers
- Key rotation policy: automatic 12-month rotation (configurable to 90-day for regulated workloads)
- Envelope encryption for all audit log entries: each log entry is encrypted with a unique data key

---

## Authentication & Access Control

### API Authentication
All API requests require a bearer token in the `Authorization` header:

```
Authorization: Bearer nf_live_<token>
```

**Key types:**

| Key Type | Prefix | Use |
|----------|--------|-----|
| Live key | `nf_live_` | Production decisions |
| Test key | `nf_test_` | Sandbox evaluation (no enforcement) |
| Admin key | `nf_admin_` | Tenant management operations |
| Read-only key | `nf_ro_` | Audit log export, dashboard read |

Keys are scoped to a tenant. Cross-tenant access is not possible via the API.

### Role-Based Access Control (v1.1)

RBAC ships in v1.1. MVP uses API key scoping. Planned roles:

| Role | Permissions |
|------|-------------|
| Admin | Full access — create/delete rules, manage agents, export audit |
| Compliance Analyst | Read all + acknowledge alerts + export audit |
| Engineer | Read all + create/edit rules (cannot delete) |
| Read Only | Dashboard and audit log read access only |
| Auditor | Audit log export only (time-bounded access) |

### Dashboard Authentication
The dashboard authenticates via API key or SAML SSO (Enterprise). SAML SSO supports Okta, Azure AD, and Google Workspace. Session tokens expire after 8 hours of inactivity.

---

## Threat Model

### Trust Boundaries

```
[AI Agent]  →  [Nullify API Gateway]  →  [Rule Evaluator]
                      ↑                         ↑
              (External boundary)      (Internal boundary)
              API key required         mTLS required
```

The primary external attack surface is the `/v1/evaluate` endpoint. All other services are internal-only.

### Threat Scenarios

**T1 — Decision Payload Injection**
An attacker submits a crafted decision payload designed to bypass rule evaluation (e.g., by omitting required fields or injecting unexpected types).

*Mitigation:* Input validation layer rejects malformed payloads before rule evaluation. Required fields are enforced per decision type. DSL rule conditions reference typed fields only — no eval of user-supplied strings.

**T2 — API Key Compromise**
A leaked API key is used to submit fraudulent decisions or read audit data.

*Mitigation:* Keys are tenant-scoped. Compromised key can only access that tenant's data. Key rotation is available on demand. Unusual API patterns (high volume from unexpected IPs) trigger automatic alerts.

**T3 — Audit Log Tampering**
An attacker with database access attempts to modify or delete audit records to hide decision history.

*Mitigation:* Audit store is append-only at the storage layer (S3 object lock). Each entry is HMAC-SHA256 signed. A separate verification service runs daily integrity checks across the audit log. Deletes return an error at the API layer even for admin roles.

**T4 — Rule Library Manipulation**
An internal actor modifies rules to weaken enforcement (e.g., raise DTI threshold to approve more loans).

*Mitigation:* Rule changes are versioned and logged with the actor identity and timestamp. Rule change events appear in the audit stream. Critical rule modifications require 2-person approval (Enterprise feature, v1.1). Alert fires when any critical or high severity rule is modified.

**T5 — Behavioral Baseline Poisoning**
An attacker submits a large volume of synthetic decisions to shift the baseline and make abnormal behavior appear normal.

*Mitigation:* Baseline updates are rate-limited and smoothed using an exponentially weighted moving average. Sudden baseline shifts (>20% in 24h) trigger an alert. Baseline can be manually frozen by a compliance analyst.

**T6 — Denial of Service on Intercept Endpoint**
A flood of requests overwhelms the `/v1/evaluate` endpoint, causing it to become unavailable.

*Mitigation:* Rate limits per tenant (100–1000 req/s depending on plan). DDoS protection via Cloudflare. Failover modes ensure agents continue to operate (fail-open) or halt safely (fail-closed) if Nullify is unreachable.

**T7 — Cross-Tenant Data Leakage**
A bug causes one tenant's decision data or rules to be visible to another tenant.

*Mitigation:* All database queries use row-level security (RLS) enforced at the PostgreSQL layer, not just the application layer. Tenant ID is extracted from the authenticated API key — it cannot be overridden by the request body. Automated tests verify cross-tenant isolation on every deployment.

---

## Data Handling

### Data Classification

| Data Type | Classification | Retention | Encryption |
|-----------|---------------|-----------|------------|
| Decision payloads | Confidential | 7 years | AES-256 |
| Audit log entries | Confidential | 7 years | AES-256 + HMAC |
| Agent metadata | Internal | Indefinite | AES-256 |
| Rule definitions | Internal | Versioned | AES-256 |
| API keys | Secret | Active lifetime | bcrypt (hash only) |
| Alert history | Internal | 90 days | AES-256 |
| Baseline time-series | Internal | 13 months | AES-256 |

### Data Residency

| Region | Customers | Notes |
|--------|-----------|-------|
| us-east-1 | Default for US customers | |
| eu-west-1 | EU customers (default) | EU AI Act data residency compliant |
| ap-southeast-1 | APAC customers | |
| Customer VPC | Enterprise, on-prem | Private deployment (v1.1+) |

### Data Minimization
Nullify does not retain the raw agent input that generated a decision beyond what is in the decision payload itself. The platform does not access underlying agent models, training data, or inference logs. Only decision outputs are intercepted.

### Right to Deletion
For consumer-facing regulated workloads (e.g., CCPA, GDPR), Nullify supports deletion of audit records by patient/customer identifier on request, subject to applicable legal hold requirements. Financial and healthcare records subject to mandatory retention periods are flagged and excluded from bulk deletion.

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P0 | Audit store integrity failure, cross-tenant breach | 15 min | CEO + Legal + CTO |
| P1 | Intercept endpoint down >5 min, rule evaluation failure | 30 min | Engineering on-call |
| P2 | Performance degradation >P95 threshold, alert delivery failure | 2 hours | Engineering team |
| P3 | Non-critical feature failure, elevated error rates | Next business day | Engineering backlog |

### Breach Notification
In the event of a confirmed data breach affecting customer data, Nullify will notify affected customers within 72 hours in accordance with GDPR Article 33 and applicable state breach notification laws. Notification will include the nature of the breach, data categories affected, estimated number of records, and remediation steps taken.

---

## Penetration Testing

- External penetration test conducted annually by a third-party firm
- Scope: API endpoints, authentication flows, tenant isolation, audit log integrity
- Bug bounty program: responsible disclosure to security@nullify.ai
- Last test date: Q1 2026 (results available under NDA to Enterprise customers)

---

## Security Contact

**Email:** security@nullify.ai  
**PGP Key:** Available at https://nullify.ai/.well-known/security.txt  
**Response SLA:** 24 hours for critical vulnerabilities, 72 hours for all others

---

## Open Questions

1. **On-premise deployment security model** — when Nullify runs inside a customer VPC, what security guarantees does Nullify provide vs. what becomes the customer's responsibility? Line of demarcation needs definition before v1.1.
2. **AI agent identity verification** — currently, agent identity is asserted by the API key + `X-Agent-ID` header. Should Nullify cryptographically verify agent identity (e.g., via signed attestation from the agent runtime)? Relevant for high-stakes healthcare deployments.
3. **Audit log portability** — customers want to own their audit logs. Should Nullify support continuous export to a customer-owned S3 bucket? This would reduce vendor lock-in concerns for regulated industries.

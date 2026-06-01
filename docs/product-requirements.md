# Product Requirements Document (PRD)

**Product:** Nullify AI  
**Version:** 1.0 (MVP)  
**Status:** Prototype  
**Last Updated:** May 2026

---

## Problem Statement

AI agents in regulated industries are making decisions at machine speed — hundreds or thousands per hour. The tools used to govern those decisions were built for human reviewers operating at human speed.

When a human reviewer makes a bad call, it affects one case. When an AI agent's rule is miscalibrated, it affects every case it processes before the next audit cycle catches the problem.

**The gap Nullify fills:** There are no tools today that intercept and enforce AI agent decisions in real time, before they execute. Current AI governance tools are observational — they monitor, log, and report after the fact. Nullify is the first pre-action enforcement layer.

---

## Target Users

### Primary Personas

**1. Chief Compliance Officer (CCO)**
- Responsible for regulatory adherence across all AI deployments
- Needs real-time visibility into what AI agents are doing and why
- Biggest fear: regulatory finding that reveals AI was making unauthorized decisions for weeks before detection
- Key question: "If the EU AI Act auditor walks in tomorrow, can I show them a complete record of every AI decision and the rule that governed it?"

**2. Head of AI / ML Engineering**
- Deploys and maintains AI agents in production
- Needs a way to set behavioral boundaries before handing agents to business units
- Biggest fear: an agent going rogue in production and causing a P0 incident
- Key question: "Can I deploy this agent knowing that it physically cannot exceed these parameters?"

**3. VP / Head of Operations (Insurance, Lending, Healthcare)**
- Owns the business process the AI agent is automating
- Needs confidence that AI decisions are consistent with company policy
- Biggest fear: customer complaints, regulatory fines, or financial losses from AI errors
- Key question: "How do I know the agent is making decisions I'd be comfortable signing off on?"

**4. On-Call Compliance Analyst**
- Monitors AI agent behavior day-to-day
- Needs clear signals about what needs attention and what doesn't
- Biggest fear: missing a critical signal buried in noise
- Key question: "Which agents need my attention right now, and what exactly is wrong?"

---

## Use Cases

### UC-01: Loan Underwriting Guard Rails
An AI agent reviews personal loan applications and approves or denies them based on creditworthiness criteria. The compliance team needs to ensure the agent never approves loans exceeding DTI ratio limits, never approves outside geographic risk tiers, and always verifies income before funding.

**Without Nullify:** Miscalibrated DTI logic approves high-risk loans until the weekly audit catches it. Potentially hundreds of non-compliant loans funded.

**With Nullify:** LOAN-DTI-01 blocks any decision where DTI exceeds 43%. LOAN-GEO-04 requires geographic risk verification. The first non-compliant decision is caught before it funds.

---

### UC-02: Healthcare Prior Authorization
An AI agent processes prior authorization requests for an insurance plan. It must cross-reference procedure codes with diagnosis codes, verify formulary coverage, and confirm provider network status before approving.

**Without Nullify:** A broken formulary lookup causes the agent to approve procedures without checking the diagnosis match. Hundreds of unauthorized authorizations issued before the monthly claims audit.

**With Nullify:** HC-FORMULARY-01 catches the first mismatched authorization (CPT-27447 against F32.9 depression diagnosis) in 6ms. Agent is flagged critical. Human review initiated before the $38,000 procedure is scheduled.

---

### UC-03: Fraud Detection Baseline Monitoring
A fraud detection agent screens thousands of transactions per hour. Its block rate is the signal: if it's catching fraud normally, the block rate is stable. If the model degrades, the block rate drops — but this isn't visible unless you're watching it.

**Without Nullify:** FraudScanner-X's block rate collapses 94% over 48 hours. Nobody notices because the dashboard only shows "decisions processed." Estimated $2.1M/day in fraudulent transactions clearing.

**With Nullify:** Behavioral baseline ML detects the block rate collapse. Drift score rises from 22 to 91 over 48 hours. L3 alert fires. Agent auto-blocked pending investigation. The underlying model degradation is identified and retraining is triggered.

---

### UC-04: EU AI Act Compliance Audit
A financial institution is audited under the EU AI Act. The auditor requests documentation of every AI decision in a high-risk AI system over the past 12 months, including the rules governing each decision and evidence that decisions were monitored in real time.

**Without Nullify:** 3–6 months of engineering work to reconstruct decision logs from fragmented systems. Gaps in coverage. Likely finding.

**With Nullify:** Pull the audit export from the immutable audit store. Full decision trace, rule evaluation context, verdict, and timestamp for every decision. Generated in minutes.

---

## MVP Scope

### In MVP (v1.0)

- REST API intercept endpoint (`POST /v1/evaluate`)
- Rule evaluation engine with DSL (50 rules max per tenant)
- Native SDKs: Python, TypeScript
- Framework integrations: OpenAI, Anthropic, LangChain
- Behavioral baseline (simple statistical model — block rate, violation rate, decision type distribution)
- Verdict types: APPROVED, BLOCKED, ESCALATED
- Immutable audit log (JSON export)
- Alert delivery: Slack, email
- Dashboard: agent list, drift score, violation count, decision stream
- Failover modes: fail-open, fail-closed
- Three pre-built vertical rule libraries: insurance claims, loan underwriting, healthcare prior authorization

### Deferred to v1.1+

- AWS Bedrock, Azure AI, CrewAI integrations
- Advanced behavioral baseline ML (feature distribution modeling)
- PagerDuty, webhook, SMS alert channels
- Per-agent rule overrides in dashboard
- Audit PDF export (regulatory format)
- Multi-tenancy and RBAC
- Usage-based billing infrastructure
- On-premise deployment option

### Out of Scope (v1.x)

- Building or training AI agents (we intercept; we don't replace)
- Post-hoc audit remediation
- Agent performance optimization
- Model fine-tuning recommendations

---

## Success Metrics

### MVP Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first decision intercepted | <4 hours from signed contract | Onboarding logs |
| P95 intercept latency | <10ms | API telemetry |
| Rule evaluation accuracy | 100% against test suite | Automated tests |
| False positive rate | <0.5% (rules firing incorrectly) | Customer QA review |
| Pilot customer satisfaction | >4/5 NPS | Post-onboarding survey |
| Pilot-to-paid conversion | >25% | CRM |

### Business Metrics (Year 1)

| Metric | Target |
|--------|--------|
| Paying enterprise customers | 10 |
| ARR | $1.5M |
| Gross margin | >70% |
| Churn | <5% |
| NPS | >40 |

---

## Constraints & Assumptions

**Constraints:**
- Must not add more than 10ms P95 latency to agent decision cycles
- Must not require architectural changes to existing agent deployments
- Must work with air-gapped or private cloud environments for enterprise customers
- Audit logs must be immutable and cryptographically verifiable

**Assumptions:**
- Enterprises will route agent decisions through a single intercept endpoint (required for the product to work)
- Initial customers accept 4-week onboarding timelines (manual rule definition process)
- EU AI Act enforcement begins August 2026 (regulatory forcing function)
- Target customers have at least one AI agent in production handling decisions with financial consequences

---

## Open Questions

1. **Rule authoring UX:** Should compliance officers author rules in a visual builder (lower floor, lower ceiling) or structured YAML/DSL (higher ceiling, steeper learning curve)? Initial hypothesis: YAML for MVP, visual builder in v2.
2. **Pricing model:** Annual subscription vs. usage-based (per-decision). Both have merit. Hybrid (annual base + usage overage) is the likely path.
3. **False positive handling:** How does a customer dispute a rule triggering incorrectly? Need a feedback loop from the review queue back into the rule library.
4. **Model versioning:** When an agent's underlying model is updated, should the behavioral baseline reset? Likely yes, with a transition period.

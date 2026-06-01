# System Architecture

## Overview

Nullify AI is an **enforcement layer** that sits between AI agents and the systems they interact with. Every decision an agent attempts to make is intercepted, evaluated against behavioral rules and baselines, and returned with a verdict — APPROVED, BLOCKED, or ESCALATED — before the decision executes.

The core design principle is **pre-action, not post-audit**. Existing AI governance tools observe and report. Nullify intercepts and enforces.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ENTERPRISE ENVIRONMENT                         │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  LoanBot-α   │    │ ClaimsAgent  │    │ PriorAuth-HC │  ...         │
│  │  (OpenAI)    │    │ (Anthropic)  │    │ (Bedrock)    │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │  All agent decisions route here           │
│                             ▼                                           │
│            ┌────────────────────────────────────┐                      │
│            │         NULLIFY AI LAYER           │                      │
│            │                                    │                      │
│            │  ① API Intercept Gateway           │                      │
│            │  ② Rule Evaluation Engine          │                      │
│            │  ③ Behavioral Baseline ML          │                      │
│            │  ④ Verdict Engine                  │                      │
│            │  ⑤ Audit Logger                    │                      │
│            │  ⑥ Alert & Escalation Engine       │                      │
│            └──────────┬─────────────────────────┘                      │
│                       │                                                 │
│         ┌─────────────┼──────────────────┐                             │
│         ▼             ▼                  ▼                              │
│    APPROVED        BLOCKED          ESCALATED                           │
│    Executes      Halted +          Human review                         │
│    normally      audit log         queue                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### ① API Intercept Gateway

The entry point for all agent decisions. Every agent framework routes decisions through a single REST or gRPC endpoint before execution.

**Key requirements:**
- P95 latency: <10ms (enforcement adds <10ms to each decision cycle)
- P99 latency: <25ms
- Availability: 99.9% uptime SLA
- Throughput: 10,000+ decisions/second per tenant
- Failover modes: `fail-open` (pass through if unreachable) or `fail-closed` (halt agent)

**Integration pattern:**

```
BEFORE Nullify:
  agent.decide(input) → real_world.execute(decision)

AFTER Nullify:
  agent.decide(input) → nullify.evaluate(decision) → {
    APPROVED  → real_world.execute(decision)
    BLOCKED   → audit_log.record(decision) + alert.fire()
    ESCALATED → review_queue.add(decision) + notify.on_call()
  }
```

**Supported frameworks (native SDKs):**
- OpenAI Agents API
- Anthropic Claude API
- AWS Bedrock Agent Runtime
- Azure AI Studio
- LangChain (Python + JS)
- CrewAI
- Custom agents via REST API

---

### ② Rule Evaluation Engine

Evaluates each intercepted decision against the tenant's behavioral rule library. Rules are authored in a structured DSL and compiled to fast evaluation logic at deploy time.

**Rule structure:**

```yaml
rule:
  code: HC-FORMULARY-01
  name: Formulary Cross-Check
  vertical: healthcare
  severity: critical
  condition: |
    decision.type == "prior_authorization"
    AND NOT formulary.contains(
      procedure_code = decision.cpt_code,
      diagnosis_code = patient.icd10_code,
      plan_id = member.plan_id
    )
  action: BLOCK
  message: "CPT {cpt_code} not authorized for ICD-10 {icd10_code} under plan {plan_id}"
  thresholds:
    match_strictness: exact
    formulary_version: "2026-Q1"
```

**Evaluation pipeline:**
1. Parse decision payload from agent
2. Hydrate context (patient record, policy data, risk parameters)
3. Evaluate applicable rules in priority order
4. Return first BLOCK/ESCALATE match, or APPROVED if all pass
5. Record full evaluation context to audit log

**Performance target:** Rule set evaluation <5ms for up to 100 active rules per tenant.

---

### ③ Behavioral Baseline ML

Builds a statistical model of each agent's normal decision behavior. Surfaces drift when an agent's current behavior deviates from its established baseline.

**What the baseline captures:**
- Decision type distribution (approval rate, block rate, escalation rate)
- Feature value distributions per decision type
- Rule trigger frequency and pattern
- Temporal patterns (time-of-day, weekday/weekend variance)

**Drift score calculation:**

```
drift_score = weighted_average(
  distribution_shift(current_window, baseline),     # 40%
  rule_violation_rate_change(24h vs 7d average),    # 35%
  block_rate_delta(current vs baseline),            # 25%
)

# Scored 0–100
# 0–30:  Normal operating range
# 31–60: Warning — monitor closely
# 61–80: Critical — investigation required
# 81–100: Severe — immediate action recommended
```

**Alert thresholds (configurable per agent):**

| Score | Status | Default Action |
|-------|--------|----------------|
| 0–30 | Healthy | Dashboard only |
| 31–60 | Warning | Slack notification |
| 61–80 | Critical | PagerDuty P1 + email |
| 81–100 | Severe | Auto-block prompt + all channels |

**Key insight — FraudScanner-X pattern:** A fraud detection agent with a *falling* block rate is a critical signal, not a healthy one. The baseline captures the expected block rate range. A 94% block rate collapse triggers the same alarm as a 94% block rate spike — both are equally anomalous relative to baseline.

---

### ④ Verdict Engine

Produces a deterministic verdict for each decision based on rule evaluation output and risk scoring. Designed for auditability — every verdict includes a full explanation.

**Verdict payload:**

```json
{
  "verdict": "BLOCKED",
  "decision_id": "dec_8xK2mN9p",
  "agent_id": "priorauth-hc",
  "rule_triggered": "HC-FORMULARY-01",
  "confidence": 1.0,
  "explanation": "CPT-27447 (total knee arthroplasty) is not authorized for ICD-10 F32.9 (major depressive disorder) under plan BCBS-PPO-2026.",
  "estimated_exposure": 38000,
  "evaluated_at": "2026-05-27T14:23:11.842Z",
  "latency_ms": 6,
  "recommended_action": "Route to orthopedic specialist review queue"
}
```

---

### ⑤ Immutable Audit Logger

Every decision — approved, blocked, or escalated — is logged with full evaluation context. The audit store is append-only (immutable) and cryptographically signed.

**What is logged:**
- Raw decision payload from agent
- Context data used in evaluation
- All rules evaluated and their outcomes
- Final verdict and explanation
- Latency breakdown
- Timestamp (UTC, millisecond precision)
- Agent version and framework

**Retention:** 7 years (configurable, default for financial/healthcare regulatory requirements).

**Export formats:** JSON, CSV, PDF (for regulatory audit submissions).

---

### ⑥ Alert & Escalation Engine

Routes alerts to the appropriate channels based on verdict type, severity, and escalation matrix configuration.

**Escalation matrix:**

```
L0 — Info:     New rule first triggered         → Audit log only
L1 — Warning:  Drift 31–60 or violations >10/d  → Slack
L2 — Critical: Drift 61–80 or violations >30/d  → PagerDuty P1 + Email
L3 — Severe:   Drift >80 or block rate Δ >80%   → All channels + SMS
```

---

## Data Flow Diagram

```
Agent Decision Request
        │
        ▼
┌───────────────────┐
│  API Gateway      │  ← Authentication, rate limiting, tenant routing
│  (REST / gRPC)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌──────────────────┐
│  Context Hydrator │────▶│  Data Sources    │
│                   │     │  · Policy DB     │
│  Enriches raw     │     │  · Risk tables   │
│  decision with    │     │  · Formulary API │
│  needed context   │     │  · Geo-risk feed │
└────────┬──────────┘     └──────────────────┘
         │
         ▼
┌───────────────────┐     ┌──────────────────┐
│  Rule Evaluator   │────▶│  Rules Library   │
│                   │     │  · 18+ rules     │
│  Evaluates each   │     │  · Per-vertical  │
│  rule in order    │     │  · Compiled DSL  │
└────────┬──────────┘     └──────────────────┘
         │
         ▼
┌───────────────────┐     ┌──────────────────┐
│  Baseline ML      │────▶│  Baseline Store  │
│                   │     │  · Per-agent     │
│  Checks behavior  │     │  · Time-series   │
│  against baseline │     │  · Feature distrib│
└────────┬──────────┘     └──────────────────┘
         │
         ▼
┌───────────────────┐
│  Verdict Engine   │
│                   │
│  APPROVED         │──────────────────────▶ Agent continues
│  BLOCKED          │──┐
│  ESCALATED        │──┼────────▶ Audit Log + Alert Engine
└───────────────────┘  │
                       ▼
               ┌───────────────┐
               │  Audit Logger │──▶ Immutable store
               └───────────────┘
```

---

## Infrastructure Architecture (Recommended)

```
                              ┌──────────────────┐
                              │   Load Balancer  │
                              │   (AWS ALB /     │
                              │    Cloudflare)   │
                              └────────┬─────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                         ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │  API Intercept  │     │  API Intercept  │     │  API Intercept  │
    │  Node (us-east) │     │  Node (eu-west) │     │  Node (ap-se)   │
    │                 │     │  [EU AI Act]    │     │                 │
    └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
             │                       │                        │
             └───────────────────────┼────────────────────────┘
                                     │
                    ┌────────────────┴─────────────────┐
                    ▼                                   ▼
         ┌─────────────────┐               ┌──────────────────┐
         │  Rule Evaluation │               │  Baseline ML     │
         │  Service         │               │  Service         │
         │  (Stateless,     │               │  (Stateful,      │
         │   auto-scaling)  │               │   per-tenant)    │
         └────────┬────────┘               └────────┬─────────┘
                  │                                  │
                  └─────────────────┬────────────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                        ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │  Rules DB        │   │  Audit Store     │   │  Baseline Store  │
   │  (PostgreSQL,    │   │  (Append-only,   │   │  (TimescaleDB /  │
   │   per-tenant     │   │   S3 + DynamoDB) │   │   InfluxDB)      │
   │   row security)  │   │                  │   │                  │
   └──────────────────┘   └──────────────────┘   └──────────────────┘
```

**Key infrastructure decisions:**
- **Multi-region deployment** — EU nodes for EU AI Act data residency requirements
- **Stateless API nodes** — horizontal scaling, no session state
- **Append-only audit store** — immutability enforced at storage layer, not application layer
- **Per-tenant row-level security** — data isolation without separate databases

---

## Failover Design

Two modes, configurable per agent:

**Fail-open** (default for most agents)
- If Nullify is unreachable, decisions pass through
- All decisions queued for retroactive audit evaluation
- Alert fires immediately on Nullify unavailability

**Fail-closed** (recommended for high-risk workflows)
- If Nullify is unreachable, agent halts
- On-call alert fires
- Agent resumes when Nullify confirms availability

Most healthcare and insurance workflows should run fail-closed. Loan origination workflows with human-in-the-loop fallback can run fail-open.

---

## Performance Benchmarks (Target)

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| API intercept P50 latency | <4ms | — |
| API intercept P95 latency | <10ms | >20ms triggers alert |
| API intercept P99 latency | <25ms | >50ms triggers incident |
| Rule evaluation (100 rules) | <5ms | — |
| Baseline ML scoring | <3ms | — |
| Audit write (async) | <50ms | — |
| Throughput per node | 10K decisions/sec | — |
| Uptime SLA | 99.9% | <99.5% = SLA breach |

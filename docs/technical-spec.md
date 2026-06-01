# Technical Specification

## API Design

### Base URL

```
https://api.nullify.ai/v1
```

All requests require a bearer token in the `Authorization` header.

---

## Core Endpoints

### POST /evaluate

The primary intercept endpoint. Called by the agent SDK before every decision executes.

**Request:**

```http
POST /v1/evaluate
Authorization: Bearer <api_key>
Content-Type: application/json
X-Agent-ID: priorauth-hc
X-Tenant-ID: acme-health
```

```json
{
  "decision": {
    "type": "prior_authorization",
    "action": "approve",
    "payload": {
      "patient_id": "PAT-88821",
      "member_plan_id": "BCBS-PPO-2026",
      "procedure_code": "27447",
      "diagnosis_code": "F32.9",
      "requesting_provider": "NPI-1234567890",
      "requested_date": "2026-06-01"
    }
  },
  "agent_context": {
    "model": "anthropic.claude-3-5-sonnet",
    "decision_id": "agent-local-uuid-1234",
    "session_id": "sess_abc123"
  }
}
```

**Response — APPROVED:**

```json
{
  "verdict": "APPROVED",
  "decision_id": "dec_8xK2mN9p",
  "latency_ms": 4,
  "rules_evaluated": 8,
  "rules_triggered": 0,
  "evaluated_at": "2026-05-27T14:23:11.842Z"
}
```

**Response — BLOCKED:**

```json
{
  "verdict": "BLOCKED",
  "decision_id": "dec_9yL3nO0q",
  "latency_ms": 6,
  "rules_evaluated": 8,
  "rules_triggered": 1,
  "blocking_rule": {
    "code": "HC-FORMULARY-01",
    "name": "Formulary Cross-Check",
    "severity": "critical",
    "explanation": "CPT-27447 (total knee arthroplasty) is not authorized for ICD-10 F32.9 (major depressive disorder) under plan BCBS-PPO-2026.",
    "estimated_exposure_usd": 38000
  },
  "evaluated_at": "2026-05-27T14:23:17.103Z",
  "recommended_action": "Route to orthopedic specialist review queue"
}
```

**Response — ESCALATED:**

```json
{
  "verdict": "ESCALATED",
  "decision_id": "dec_1zA4pP2r",
  "latency_ms": 8,
  "escalation_reason": "Income verification incomplete — 24h window expired",
  "escalation_rule": "LOAN-STIP-03",
  "review_queue_id": "rq_loan_8821",
  "assigned_to": "loan-review@acme.com",
  "evaluated_at": "2026-05-27T14:23:19.441Z"
}
```

---

### GET /agents

List all agents registered to the tenant.

```http
GET /v1/agents
Authorization: Bearer <api_key>
```

```json
{
  "agents": [
    {
      "id": "priorauth-hc",
      "name": "PriorAuth-HC",
      "vertical": "healthcare",
      "status": "critical",
      "drift_score": 87,
      "decisions_today": 892,
      "block_rate": 0.087,
      "violations_24h": 73,
      "framework": "aws-bedrock",
      "created_at": "2026-01-15T09:00:00Z",
      "last_decision_at": "2026-05-27T14:23:17Z"
    }
  ],
  "total": 6,
  "critical_count": 2,
  "warning_count": 2
}
```

---

### POST /agents/:id/block

Immediately halt all outgoing decisions from an agent.

```http
POST /v1/agents/priorauth-hc/block
Authorization: Bearer <api_key>
```

```json
{
  "reason": "Drift score 87 — formulary lookup failure confirmed",
  "blocked_by": "compliance-lead@acme.com",
  "notify_channels": ["slack", "pagerduty", "email"]
}
```

**Response:**

```json
{
  "agent_id": "priorauth-hc",
  "status": "blocked",
  "blocked_at": "2026-05-27T14:30:00Z",
  "decisions_halted": 0,
  "audit_snapshot_id": "snap_8xK2mN9p",
  "resume_requires": "manual_approval"
}
```

---

### GET /agents/:id/decisions

Paginated decision history for a specific agent.

```http
GET /v1/agents/priorauth-hc/decisions?verdict=BLOCKED&limit=50&offset=0
Authorization: Bearer <api_key>
```

---

### Rules Endpoints

```http
GET    /v1/rules                    # List all rules
POST   /v1/rules                    # Create rule
GET    /v1/rules/:code              # Get rule by code
PATCH  /v1/rules/:code              # Update rule thresholds
DELETE /v1/rules/:code              # Delete rule
POST   /v1/rules/:code/enable       # Enable rule
POST   /v1/rules/:code/disable      # Disable rule
GET    /v1/rules/:code/violations   # Get recent violations
```

---

### Alert Config Endpoints

```http
GET    /v1/alerts/config            # Get alert configuration
PATCH  /v1/alerts/config            # Update global thresholds
GET    /v1/alerts/channels          # List notification channels
POST   /v1/alerts/channels          # Add channel
DELETE /v1/alerts/channels/:id      # Remove channel
POST   /v1/alerts/channels/:id/test # Send test alert
GET    /v1/alerts/history           # Get alert history
PATCH  /v1/alerts/:id/acknowledge   # Acknowledge alert
```

---

## Data Models

### Decision

```typescript
interface Decision {
  id: string;                    // dec_<nanoid>
  agent_id: string;
  tenant_id: string;
  type: string;                  // "prior_authorization" | "loan_approval" | ...
  action: string;                // "approve" | "deny" | "escalate"
  payload: Record<string, any>;  // Raw decision data from agent
  verdict: "APPROVED" | "BLOCKED" | "ESCALATED";
  blocking_rule?: RuleCode;
  explanation?: string;
  estimated_exposure_usd?: number;
  latency_ms: number;
  rules_evaluated: number;
  context_hydration_ms: number;
  rule_evaluation_ms: number;
  evaluated_at: Date;
  agent_context: {
    model: string;
    session_id: string;
    framework: AgentFramework;
  };
}
```

### Agent

```typescript
interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  vertical: "insurance" | "fintech" | "healthcare" | "fraud" | "other";
  framework: AgentFramework;
  status: "healthy" | "warning" | "critical" | "blocked";
  drift_score: number;           // 0–100
  drift_score_updated_at: Date;
  failover_mode: "fail-open" | "fail-closed";
  auto_block_enabled: boolean;
  auto_block_threshold: number;  // Drift score that triggers auto-block
  active_rules: string[];        // Rule codes applied to this agent
  thresholds: AgentThresholds;
  created_at: Date;
  last_decision_at: Date;
}
```

### Rule

```typescript
interface Rule {
  code: string;                   // e.g. "HC-FORMULARY-01"
  name: string;
  description: string;
  vertical: Vertical;
  severity: "critical" | "high" | "medium" | "low";
  condition: string;             // DSL expression
  action: "BLOCK" | "ESCALATE" | "ALERT";
  thresholds: Record<string, any>;
  applies_to: string[];          // Agent IDs or ["*"] for all
  active: boolean;
  violations_24h: number;
  violations_7d: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}
```

---

## Agent Framework Integrations

### OpenAI Agents SDK

```python
from nullify import NullifyInterceptor

interceptor = NullifyInterceptor(api_key="nf_live_...")

@interceptor.wrap(agent_id="loanbot-alpha")
async def loan_decision(context: RunContext) -> str:
    # Your existing agent logic — unchanged
    return await agent.run(context)
```

### Anthropic Claude

```python
from nullify.integrations import AnthropicInterceptor
import anthropic

client = anthropic.Anthropic()
nullify = AnthropicInterceptor(
    client=client,
    agent_id="claims-agent-7",
    api_key="nf_live_..."
)

# Use nullify.client anywhere you'd use anthropic.client
response = await nullify.client.messages.create(...)
```

### LangChain

```python
from nullify.integrations.langchain import NullifyCallbackHandler

handler = NullifyCallbackHandler(
    agent_id="fraudscanner-x",
    api_key="nf_live_..."
)

chain = LLMChain(
    llm=llm,
    callbacks=[handler]   # Drop-in — no other changes
)
```

### REST API (any framework)

For custom or unsupported frameworks, route decisions through the REST API directly:

```python
import httpx

async def make_decision(decision_payload: dict) -> dict:
    # 1. Get agent's proposed decision
    agent_decision = await your_agent.decide(decision_payload)

    # 2. Evaluate with Nullify before executing
    verdict = await httpx.post(
        "https://api.nullify.ai/v1/evaluate",
        headers={"Authorization": f"Bearer {NULLIFY_API_KEY}"},
        json={
            "decision": agent_decision,
            "agent_context": {"agent_id": "your-agent-id"}
        }
    )

    # 3. Only execute if approved
    if verdict["verdict"] == "APPROVED":
        return await real_world.execute(agent_decision)
    elif verdict["verdict"] == "BLOCKED":
        raise DecisionBlockedError(verdict["blocking_rule"])
    else:
        return await review_queue.add(agent_decision, verdict)
```

---

## Webhook Specification

Nullify sends webhook events to your configured endpoint for all verdicts, status changes, and alerts.

**Payload structure:**

```json
{
  "event": "decision.blocked",
  "timestamp": "2026-05-27T14:23:17.103Z",
  "tenant_id": "acme-health",
  "data": {
    "decision_id": "dec_9yL3nO0q",
    "agent_id": "priorauth-hc",
    "verdict": "BLOCKED",
    "blocking_rule": "HC-FORMULARY-01",
    "estimated_exposure_usd": 38000
  },
  "signature": "sha256=<hmac>"
}
```

**Event types:**

| Event | Trigger |
|-------|---------|
| `decision.approved` | Decision passed all rules |
| `decision.blocked` | Rule triggered, decision halted |
| `decision.escalated` | Decision routed to human review |
| `agent.status_changed` | Agent moves between health states |
| `agent.blocked` | Agent manually or auto-blocked |
| `agent.drift_alert` | Drift score crosses threshold |
| `rule.violation` | Rule triggered for first time in session |
| `alert.fired` | Any alert condition met |

---

## SDK Error Handling

```python
from nullify.exceptions import (
    NullifyUnavailableError,    # API unreachable — check failover_mode
    DecisionBlockedError,       # Decision was blocked — check .rule_code
    RateLimitError,             # Too many requests
    InvalidPayloadError,        # Malformed decision payload
    AgentBlockedError,          # Agent is currently blocked
)

try:
    verdict = await nullify.evaluate(decision)
except DecisionBlockedError as e:
    logger.warning(f"Blocked by rule {e.rule_code}: {e.explanation}")
    audit_log.record(e.decision_id, "blocked")
except NullifyUnavailableError:
    # Handle based on your failover_mode setting
    if agent.failover_mode == "fail-closed":
        raise AgentHaltError("Nullify unavailable — agent halted per fail-closed policy")
    else:
        logger.warning("Nullify unreachable — fail-open, queuing for retroactive audit")
        retroactive_queue.add(decision)
```

---

## Rate Limits

| Plan | Decisions/second | Decisions/month |
|------|-----------------|-----------------|
| Starter | 100/s | 10M |
| Pro | 1,000/s | 100M |
| Enterprise | Custom | Unlimited |

Limits are per-tenant. Headers returned on every response:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1716825600
```

---

## Versioning

The API is versioned via URL path (`/v1/`, `/v2/`). Breaking changes require a new major version. Minor additions (new fields, new endpoints) are non-breaking and added to the current version.

Current version: `v1`

---

## SDK Availability

| Language | Status | Package |
|----------|--------|---------|
| Python | Available | `pip install nullify-ai` |
| TypeScript / JS | Available | `npm install @nullify/sdk` |
| Go | In progress | `go get nullify.ai/sdk` |
| Java | Planned | — |
| Ruby | Planned | — |
| REST API | Always available | — |

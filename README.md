[README.md](https://github.com/user-attachments/files/28482796/README.md)
# Nullify AI — Interactive Prototype

> **Pre-action enforcement for AI agents in regulated industries.**
> Intercept every agent decision. Approve, block, or escalate — in under 10ms, before it reaches the real world.

![Status](https://img.shields.io/badge/status-prototype-blueviolet)
![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-blue)
![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-August%202026-orange)

---

## What Is This?

AI agents in regulated industries — healthcare, lending, insurance, fraud detection — make hundreds of consequential decisions per hour. When a human makes a bad call, it affects one case. When an AI agent gets a rule wrong, it affects every case until the next audit.

**Nullify AI sits between the agent and the real world.** Every API call an agent makes is intercepted, evaluated against your policies, and either approved or blocked — before anything executes.

This repository is a high-fidelity front-end prototype demonstrating the full product experience: the monitoring dashboard, live policy creation, system architecture, rules library, and a recording-ready interactive demo.

> ⚠️ **Prototype only.** All logic runs in the browser. No backend, no live integrations, no real data.

---

## Live Demo

👉 **[View on GitHub Pages](https://YOUR_USERNAME.github.io/nullify-ai-prototype)**

---

## The Three Verdicts

| Verdict | Meaning |
|---------|---------|
| ✅ **APPROVED** | Policy satisfied — action executes |
| 🚫 **BLOCKED** | Rule violation — action cancelled, logged |
| 🔔 **ESCALATE** | High-risk edge case — human-in-the-loop triggered |

---

## What's Inside

| Page | Description |
|------|-------------|
| [`index.html`](index.html) | Hub — links to all demos |
| [`pages/landing.html`](pages/landing.html) | Marketing landing page with animated hero, pricing, FAQ |
| [`pages/dashboard.html`](pages/dashboard.html) | Live multi-agent monitoring dashboard with guided 7-step walkthrough |
| [`pages/architecture-animated.html`](pages/architecture-animated.html) | Animated system architecture — moving arrows, 4 live scenarios |
| [`pages/architecture.html`](pages/architecture.html) | Static system architecture diagram |
| [`pages/rules.html`](pages/rules.html) | Rules library (18 rules) + alert configuration panel |
| [`demo/live-demo.html`](demo/live-demo.html) | Interactive PoC — create policies live, trigger violations, see verdicts |
| [`components/NullifyArchitecture.jsx`](components/NullifyArchitecture.jsx) | React component — drop into any React / Next.js portfolio |

---

## The Six Demo Agents

| Agent | Vertical | Status | Signal |
|-------|----------|--------|--------|
| LoanBot-Alpha | Personal Loan Underwriting | ✅ Healthy | Drift 12 · 0.4% block rate |
| ClaimsAgent-7 | P&C Insurance Claims | ⚠️ Warning | Drift 58 · violations trending up 72h |
| **PriorAuth-HC** | Healthcare Prior Authorization | 🛑 Critical | Drift 87 · 73 violations/24h · formulary lookup broken |
| MortgageBot-B | Mortgage Underwriting | ⚠️ Warning | Drift 44 · stale geo-risk data feed |
| ClaimsAgent-3 | Auto Insurance Claims | ✅ Healthy | Drift 8 · 0 violations in 6 days |
| **FraudScanner-X** | Fraud Detection | 🛑 Critical | Drift 91 · block rate collapsed 94% in 48h |

**The counterintuitive signal:** FraudScanner-X has only 1 violation — it looks fine. But it's a *fraud detection* agent. A low block rate means fraud is getting through. Its block rate dropped from 1.7% → 0.1% in 48 hours. The drift score (91) is the only early warning.

---

## System Architecture

```
AI Agents  →  Nullify Enforcement  →  Verdict  →  Real-World Systems
              ┌─────────────────┐
              │ Intercept Layer │  1ms
              │ Policy Engine   │  4ms
              │ Decision Core   │  2ms   ← total < 10ms
              │ Drift Detector  │  3ms
              │ Audit Logger    │
              └─────────────────┘
```

**Integration modes:** SDK wrapper · Sidecar proxy · Network / L7 proxy

---

## Run Locally

No build step. No npm install. Just open a file.

```bash
git clone https://github.com/YOUR_USERNAME/nullify-ai-prototype
cd nullify-ai-prototype

# Option 1 — open directly
open index.html

# Option 2 — local server
python3 -m http.server 3000
# Visit http://localhost:3000
```

---

## Deploy

### GitHub Pages (free, recommended)
1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Source: `main` branch · folder: `/ (root)`
4. Live at `https://YOUR_USERNAME.github.io/nullify-ai-prototype`

### Netlify Drop (instant, no account needed)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire folder onto the page
3. Get a live URL immediately

---

## Tech Stack

- **Pure HTML, CSS, vanilla JavaScript** — zero dependencies, zero build step
- **Animated SVG** — architecture diagram uses native SVG animation
- **CSS custom properties** — consistent design token system throughout
- **React component** — `NullifyArchitecture.jsx` for portfolio integration

---

## Documentation

Open [`docs/index.html`](docs/index.html) in a browser for a navigable docs hub, or read the Markdown files directly.

| Document | Audience | Contents |
|----------|----------|----------|
| [`docs/system-architecture.md`](docs/system-architecture.md) | Engineers | Data flow, infrastructure topology, performance benchmarks |
| [`docs/technical-spec.md`](docs/technical-spec.md) | API consumers | REST API reference, TypeScript models, SDK integration |
| [`docs/product-requirements.md`](docs/product-requirements.md) | PMs · Investors | Personas, use cases, MVP scope, success metrics |
| [`docs/security-compliance.md`](docs/security-compliance.md) | Legal · Procurement | EU AI Act, HIPAA, SOC 2, threat model |


---

## Project Structure

```
nullify-ai-prototype/
├── index.html                        ← Hub page
├── README.md
├── .gitignore
├── package.json
├── pages/
│   ├── landing.html                  ← Marketing landing page
│   ├── dashboard.html                ← Agent monitoring dashboard
│   ├── architecture.html             ← Architecture diagram (static)
│   ├── architecture-animated.html    ← Architecture diagram (animated)
│   └── rules.html                    ← Rules library & alert config
├── demo/
│   └── live-demo.html                ← Interactive PoC controller
├── components/
│   └── NullifyArchitecture.jsx       ← React component for portfolio
└── docs/
    ├── index.html                    ← Docs navigation hub
    ├── system-architecture.md
    ├── technical-spec.md
    ├── product-requirements.md
    ├── security-compliance.md
    ├── demo-walkthrough.md
    └── video-script.md
```

---

## Prototyped vs. Not Yet Built

### ✅ Prototyped (front-end)
- Full product UI and interaction flows
- Multi-agent monitoring with drift scoring
- Live policy creation and violation simulation
- Block / escalate / approve verdict flows
- Rule evaluation, threshold editing, alert configuration
- Animated system architecture with scenario walkthroughs
- 7-step guided product walkthrough

### 🚧 Not yet built (backend)
- Real-time API intercept layer (target: <10ms latency)
- Agent framework integrations — OpenAI, Anthropic, LangChain, CrewAI, AWS Bedrock, Azure AI
- Behavioral baseline ML model (statistical process control)
- Live decision database and immutable audit store
- Authentication, multi-tenancy, RBAC
- Slack / PagerDuty / email notification delivery
- EU AI Act automated audit report generation

---

## Why Now

- **EU AI Act** mandates real-time monitoring for high-risk AI systems by **August 2026**
- AI governance market projected at **$109.9B by 2034** (65.8% CAGR)
- No real-time pre-action enforcement tool currently dominates the market
- One compliance failure in a regulated industry costs more than a decade of subscription revenue



*Built as a product management portfolio project · Prototype only · [Claude](https://claude.ai) (Anthropic)*

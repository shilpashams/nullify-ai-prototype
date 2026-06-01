// NullifyArchitecture.jsx
// Drop this into your portfolio. Bolt can restyle all colors/fonts/layout freely.
// Data is separated from UI at the bottom — easy to edit without touching JSX.

import { useState, useEffect, useRef } from "react";

// ── Data layer — edit freely ─────────────────────────────────────────────────

const AGENTS = [
  { id: "hc",    icon: "🏥", label: "Healthcare Agent", sub: "Prior auth · Claims" },
  { id: "loan",  icon: "💳", label: "Loan Agent",        sub: "Approvals · Risk scoring" },
  { id: "fraud", icon: "🔍", label: "Fraud Agent",       sub: "Wire transfer · Anomaly" },
  { id: "ops",   icon: "⚙️", label: "Ops Agent",         sub: "DB writes · Deploys" },
];

const NULLIFY = [
  { id: "intercept", icon: "🛡",  label: "Intercept Layer", sub: "Wraps every API call · 1ms",       color: "purple" },
  { id: "rules",     icon: "📋", label: "Policy Engine",    sub: "Rule eval · Conditions · 4ms",     color: "purple" },
  { id: "core",      icon: "🧠", label: "Decision Core",    sub: "Context fusion · Verdict · 2ms",   color: "violet", isCore: true },
  { id: "drift",     icon: "📊", label: "Drift Detector",   sub: "7-day baseline · SPC · 3ms",       color: "purple" },
  { id: "audit",     icon: "🗂",  label: "Audit Logger",     sub: "Immutable log · EU AI Act trace",  color: "purple" },
];

const VERDICTS = [
  { id: "approved", icon: "✅", label: "Approved",      sub: "Action executes",         color: "green"  },
  { id: "blocked",  icon: "🚫", label: "Blocked",       sub: "Action cancelled + logged", color: "red"    },
  { id: "escalate", icon: "🔔", label: "Escalate",      sub: "Human-in-the-loop",       color: "amber"  },
];

const SYSTEMS = [
  { id: "ehr",     icon: "🏥", label: "EHR / Claims",      sub: "Epic · Cerner" },
  { id: "banking", icon: "🏦", label: "Banking Core",       sub: "Loan · Wire systems" },
  { id: "notify",  icon: "📣", label: "Alert System",       sub: "PagerDuty · Slack" },
  { id: "siem",    icon: "🔐", label: "SIEM / Compliance",  sub: "Splunk · Audit trail" },
];

const SCENARIOS = [
  {
    id: "approved",
    label: "Approved Flow",
    accent: "green",
    steps: [
      { ms: 0,    active: ["loan"],                    stepNum: 1 },
      { ms: 700,  active: ["intercept"],               stepNum: 2 },
      { ms: 1400, active: ["rules", "core"],           stepNum: 3 },
      { ms: 2400, active: ["approved"],                stepNum: 4 },
      { ms: 3000, active: ["banking", "audit"],        stepNum: 5 },
    ],
  },
  {
    id: "blocked",
    label: "Blocked Flow",
    accent: "red",
    steps: [
      { ms: 0,    active: ["fraud"],                   stepNum: 1 },
      { ms: 700,  active: ["intercept"],               stepNum: 2 },
      { ms: 1400, active: ["rules", "core"],           stepNum: 3 },
      { ms: 2400, active: ["blocked", "audit"],        stepNum: 4 },
      { ms: 3000, active: ["notify", "siem"],          stepNum: 5 },
    ],
  },
  {
    id: "escalate",
    label: "Escalate Flow",
    accent: "amber",
    steps: [
      { ms: 0,    active: ["hc"],                      stepNum: 1 },
      { ms: 700,  active: ["intercept"],               stepNum: 2 },
      { ms: 1400, active: ["rules", "core"],           stepNum: 3 },
      { ms: 2400, active: ["escalate"],                stepNum: 4 },
      { ms: 3000, active: ["notify", "siem"],          stepNum: 5 },
    ],
  },
  {
    id: "drift",
    label: "Drift Detection",
    accent: "violet",
    steps: [
      { ms: 0,    active: ["hc","loan","fraud","ops"], stepNum: 1 },
      { ms: 800,  active: ["intercept","drift"],       stepNum: 2 },
      { ms: 1800, active: ["rules","core"],            stepNum: 3 },
      { ms: 2800, active: ["approved","blocked"],      stepNum: 4 },
      { ms: 3400, active: ["audit","siem","notify"],   stepNum: 5 },
    ],
  },
];

const STEP_LABELS = [
  "Agent fires API call",
  "Nullify intercepts",
  "Policy evaluated",
  "Verdict issued",
  "System acts (or halts)",
];

const LATENCY = [
  { label: "Intercept", ms: "1ms",  color: "#7c3aed" },
  { label: "Rules",     ms: "4ms",  color: "#3b82f6" },
  { label: "ML Score",  ms: "3ms",  color: "#10b981" },
  { label: "Verdict",   ms: "2ms",  color: "#f59e0b" },
];

// ── Color maps — Bolt: replace these with your design tokens ─────────────────

const ACCENT_COLORS = {
  purple: { border: "#7c3aed", glow: "rgba(124,58,237,0.35)", bg: "rgba(124,58,237,0.1)"  },
  violet: { border: "#8b5cf6", glow: "rgba(139,92,246,0.5)",  bg: "rgba(60,20,120,0.4)"   },
  green:  { border: "#10b981", glow: "rgba(16,185,129,0.4)",  bg: "rgba(16,185,129,0.1)"  },
  red:    { border: "#ef4444", glow: "rgba(239,68,68,0.4)",   bg: "rgba(239,68,68,0.1)"   },
  amber:  { border: "#f59e0b", glow: "rgba(245,158,11,0.4)",  bg: "rgba(245,158,11,0.1)"  },
  blue:   { border: "#3b82f6", glow: "rgba(59,130,246,0.35)", bg: "rgba(59,130,246,0.1)"  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NodeCard({ icon, label, sub, color = "blue", isCore = false, isActive = false }) {
  const ac = ACCENT_COLORS[color] || ACCENT_COLORS.blue;
  return (
    <div
      style={{
        border: `1.5px solid ${isActive ? ac.border : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding: "10px 13px",
        marginBottom: 8,
        background: isActive ? ac.bg : isCore ? "rgba(40,10,80,0.6)" : "rgba(20,28,48,0.8)",
        boxShadow: isActive ? `0 0 18px ${ac.glow}` : isCore ? "0 0 24px rgba(124,58,237,0.2)" : "none",
        transition: "all 0.35s ease",
        position: "relative",
      }}
    >
      <div style={{ fontSize: 17, marginBottom: 3 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: isCore ? "#c4b5fd" : "#f1f5f9" }}>{label}</div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

function VerdictBadge({ label, color }) {
  const ac = ACCENT_COLORS[color];
  return (
    <span
      style={{
        fontSize: 9, fontWeight: 800, letterSpacing: 1,
        padding: "2px 7px", borderRadius: 10,
        background: ac.border, color: "#fff",
        textTransform: "uppercase", position: "absolute", top: -7, right: -6,
      }}
    >
      {label}
    </span>
  );
}

function FlowArrow({ color = "#7c3aed", active = false, label = "" }) {
  const c = color;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
      <svg width={36} height={300} viewBox="0 0 36 300" style={{ overflow: "visible" }}>
        <defs>
          <marker id={`arr-${color.replace("#","")}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill={c} opacity="0.85" />
          </marker>
        </defs>
        {/* dashed animated pipe */}
        <line
          x1="18" y1="20" x2="18" y2="265"
          stroke={c}
          strokeWidth={active ? 2 : 1.5}
          strokeDasharray="7 5"
          strokeOpacity={active ? 0.85 : 0.35}
          markerEnd={`url(#arr-${color.replace("#","")})`}
          style={{ transition: "stroke-opacity 0.4s" }}
        />
        {/* animated travelling dot */}
        {active && (
          <circle r={4} fill={c} opacity={0.9}>
            <animateMotion dur="1.1s" repeatCount="indefinite" path="M18,20 L18,265" />
            <animate attributeName="opacity" values="0;1;1;0" dur="1.1s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
      {label && (
        <span style={{ fontSize: 9, color: c, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7, marginTop: -8 }}>
          {label}
        </span>
      )}
    </div>
  );
}

function ColHeader({ label, color }) {
  const ac = ACCENT_COLORS[color];
  return (
    <div
      style={{
        textAlign: "center", padding: "7px 10px", marginBottom: 12,
        borderRadius: "8px 8px 0 0",
        background: ac.bg,
        borderTop: `2px solid ${ac.border}`,
        fontSize: 10, fontWeight: 700, letterSpacing: 2,
        textTransform: "uppercase", color: ac.border,
      }}
    >
      {label}
    </div>
  );
}

function StepDots({ current }) {
  return (
    <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const isDone = num < current;
        const isActive = num === current;
        return (
          <div key={num} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11,
            color: isDone ? "#10b981" : isActive ? "#a78bfa" : "#475569" }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0,
              border: `1.5px solid ${isDone ? "#10b981" : isActive ? "#7c3aed" : "#334155"}`,
              background: isDone ? "rgba(16,185,129,0.15)" : isActive ? "rgba(124,58,237,0.2)" : "transparent",
            }}>
              {isDone ? "✓" : num}
            </div>
            {label}
          </div>
        );
      })}
    </div>
  );
}

function LatencyStrip() {
  return (
    <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", marginTop: 8, fontSize: 9, fontWeight: 600 }}>
      {LATENCY.map(l => (
        <div key={l.label} style={{
          flex: 1, padding: "4px 2px", textAlign: "center",
          background: l.color + "33", color: l.color,
        }}>
          {l.label}<br />{l.ms}
        </div>
      ))}
      <div style={{
        padding: "4px 8px", background: "rgba(255,255,255,0.07)",
        color: "#f1f5f9", fontWeight: 800, fontSize: 10, display: "flex", alignItems: "center",
      }}>
        ~10ms
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NullifyArchitecture() {
  const [activeNodes, setActiveNodes] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [scenario, setScenario] = useState(null);
  const timers = useRef([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function runScenario(scn) {
    clearTimers();
    setActiveNodes(new Set());
    setCurrentStep(0);
    setScenario(scn.id);

    scn.steps.forEach(({ ms, active, stepNum }) => {
      const t = setTimeout(() => {
        setActiveNodes(new Set(active));
        setCurrentStep(stepNum);
      }, ms);
      timers.current.push(t);
    });
  }

  function reset() {
    clearTimers();
    setActiveNodes(new Set());
    setCurrentStep(0);
    setScenario(null);
  }

  // Auto-play on mount
  useEffect(() => {
    const t = setTimeout(() => runScenario(SCENARIOS[0]), 800);
    timers.current.push(t);
    return clearTimers;
  }, []);

  const isActive = (id) => activeNodes.has(id);

  // Arrow colors driven by current scenario
  const scnObj = SCENARIOS.find(s => s.id === scenario);
  const arrow1Color = "#3b82f6";
  const arrow2Color = scnObj?.id === "blocked" ? "#ef4444" : scnObj?.id === "escalate" ? "#f59e0b" : "#7c3aed";
  const arrow3Color = scnObj?.id === "blocked" ? "#ef4444" : scnObj?.id === "escalate" ? "#f59e0b" : "#10b981";

  return (
    // Bolt: replace background/font/padding as needed
    <div style={{
      background: "#0a0a0f",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#e2e8f0",
      padding: "32px 24px",
      borderRadius: 16,
      maxWidth: 980,
      margin: "0 auto",
    }}>
      {/* ── Header — Bolt: restyle freely ── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#7c3aed", marginBottom: 6 }}>
          Nullify AI
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
          System <span style={{ color: "#a78bfa" }}>Architecture</span>
        </h2>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
          Pre-action enforcement · Real-time interception
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.35)",
          borderRadius: 20, padding: "4px 14px", fontSize: 11, color: "#a78bfa", marginTop: 10,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", display: "inline-block",
            animation: "nullify-pulse 1.5s infinite" }} />
          Total enforcement latency &lt; 10ms
        </div>
      </div>

      {/* ── Architecture grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr 44px 1fr 44px 1fr", gap: 0, alignItems: "start" }}>

        {/* Col 1 — Agents */}
        <div>
          <ColHeader label="AI Agents" color="blue" />
          {AGENTS.map(a => (
            <NodeCard key={a.id} {...a} color="blue" isActive={isActive(a.id)} />
          ))}
        </div>

        {/* Arrow 1 */}
        <FlowArrow color={arrow1Color} active={currentStep >= 1} label="API" />

        {/* Col 2 — Nullify */}
        <div>
          <ColHeader label="Nullify Enforcement" color="purple" />
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
            color: "#7c3aed", textAlign: "center", opacity: 0.7, marginBottom: 6 }}>
            ⚡ ALL CALLS INTERCEPTED BEFORE EXECUTION
          </div>
          {NULLIFY.map(n => (
            <div key={n.id} style={{ position: "relative" }}>
              <NodeCard {...n} isActive={isActive(n.id)} />
              {n.isCore && <LatencyStrip />}
            </div>
          ))}
        </div>

        {/* Arrow 2 */}
        <FlowArrow color={arrow2Color} active={currentStep >= 4} label="VERDICT" />

        {/* Col 3 — Verdicts */}
        <div>
          <ColHeader label="Verdicts" color="green" />
          <div style={{ paddingTop: 24 }}>
            {VERDICTS.map(v => (
              <div key={v.id} style={{ position: "relative", marginBottom: 10 }}>
                <VerdictBadge label={v.label} color={v.color} />
                <NodeCard {...v} isActive={isActive(v.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* Arrow 3 */}
        <FlowArrow color={arrow3Color} active={currentStep >= 5} label="EXECUTE" />

        {/* Col 4 — Systems */}
        <div>
          <ColHeader label="Real-World Systems" color="amber" />
          {SYSTEMS.map(s => (
            <NodeCard key={s.id} {...s} color="amber" isActive={isActive(s.id)} />
          ))}
        </div>

      </div>

      {/* ── Step indicators ── */}
      <StepDots current={currentStep} />

      {/* ── Scenario buttons — Bolt: restyle as tabs, pills, cards, etc. ── */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
        {SCENARIOS.map(scn => {
          const ac = ACCENT_COLORS[scn.accent] || ACCENT_COLORS.purple;
          const isSelected = scenario === scn.id;
          return (
            <button
              key={scn.id}
              onClick={() => runScenario(scn)}
              style={{
                padding: "7px 18px",
                borderRadius: 20,
                border: `1.5px solid ${ac.border}`,
                color: isSelected ? "#fff" : ac.border,
                background: isSelected ? ac.border : "transparent",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s", letterSpacing: 0.5,
              }}
            >
              ▶ {scn.label}
            </button>
          );
        })}
        <button
          onClick={reset}
          style={{
            padding: "7px 18px", borderRadius: 20,
            border: "1.5px solid #334155", color: "#64748b",
            background: "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* Pulse keyframe — Bolt can move this to a global CSS file */}
      <style>{`
        @keyframes nullify-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

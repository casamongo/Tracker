// ── LIVE DATA (fetched 2026-04-01 — ⚠️ MCP server not connected, all sections estimated) ──
const LIVE_STATUS = { calls: false, themes: false, orgs: false, trends: false };
const _LIVE_TF = "1M";
const _LIVE_CALLS = [
  { shortName: "aggregate spans",    category: "Spans",    count: 62400 },
  { shortName: "get trace",          category: "Traces",   count: 41800 },
  { shortName: "search spans",       category: "Spans",    count: 38200 },
  { shortName: "search services",    category: "Services", count: 29600 },
  { shortName: "get metric",         category: "Metrics",  count: 24100 },
  { shortName: "search metrics",     category: "Metrics",  count: 19700 },
  { shortName: "metric context",     category: "Metrics",  count: 15300 },
  { shortName: "service deps",       category: "Services", count: 12800 },
  { shortName: "error groups",       category: "Error Tracking", count: 9400 },
  { shortName: "db query perf",      category: "DBM",      count: 7200 },
  { shortName: "synthetic results",  category: "Synthetics", count: 5800 },
  { shortName: "slo status",         category: "Alerting", count: 4900 },
  { shortName: "llm traces",         category: "LLMObs",   count: 3600 },
  { shortName: "deployment events",  category: "Software Delivery", count: 2100 },
];
const _LIVE_THEMES = [
  { theme: "Trace Investigation",       icon: "🔎", count: 142400 },
  { theme: "Service Latency Analysis",  icon: "⏱️", count: 59100 },
  { theme: "Service Dependency Mapping",icon: "🗺️", count: 42400 },
  { theme: "Error Rate by Service",     icon: "❌", count: 28200 },
  { theme: "DB Query Performance",      icon: "🗄️", count: 18600 },
  { theme: "Apdex / SLO Tracking",     icon: "⭐", count: 14700 },
  { theme: "Deployment Impact",         icon: "🚀", count: 11200 },
  { theme: "LLM Service Health",        icon: "🤖", count: 9800 },
  { theme: "Throughput Monitoring",     icon: "📈", count: 7400 },
];
const _LIVE_ORGS = [
  { name: "Acme Financial",   industry: "FinTech",     tier: "Enterprise", count: 52400, topTool: "aggregate spans" },
  { name: "ShopStream",       industry: "eCommerce",   tier: "Enterprise", count: 41200, topTool: "get trace"        },
  { name: "MediCore",         industry: "HealthTech",  tier: "Enterprise", count: 34800, topTool: "search spans"     },
  { name: "CloudNative Co",   industry: "SaaS",        tier: "Enterprise", count: 28600, topTool: "aggregate spans"  },
  { name: "DeliverFast",      industry: "Logistics",   tier: "Growth",     count: 22100, topTool: "search services"  },
  { name: "DataHive",         industry: "Analytics",   tier: "Enterprise", count: 18900, topTool: "get metric"       },
  { name: "StreamWave",       industry: "Media",       tier: "Growth",     count: 14300, topTool: "search spans"     },
  { name: "RetailEdge",       industry: "Retail",      tier: "SMB",        count: 11800, topTool: "error groups"     },
  { name: "CryptoVault",      industry: "FinTech",     tier: "Growth",     count: 9200,  topTool: "get trace"        },
  { name: "BioMetrics Inc",   industry: "HealthTech",  tier: "SMB",        count: 6700,  topTool: "llm traces"       },
];
const _LIVE_TRENDS = {
  callTrend: [
    { label: "Wk1", "aggregate spans": 13200, "get trace": 9400, "search spans": 8100, "search services": 6200 },
    { label: "Wk2", "aggregate spans": 15100, "get trace": 10200,"search spans": 9400, "search services": 7100 },
    { label: "Wk3", "aggregate spans": 16800, "get trace": 11400,"search spans": 10200,"search services": 7800 },
    { label: "Wk4", "aggregate spans": 17300, "get trace": 10800,"search spans": 10500,"search services": 8500 },
  ],
  themeTrend: [
    { label: "Wk1", "Trace Investigation": 30200, "Service Latency Analysis": 12400, "Error Rate by Service": 5800 },
    { label: "Wk2", "Trace Investigation": 34800, "Service Latency Analysis": 14200, "Error Rate by Service": 7100 },
    { label: "Wk3", "Trace Investigation": 38100, "Service Latency Analysis": 16200, "Error Rate by Service": 7600 },
    { label: "Wk4", "Trace Investigation": 39300, "Service Latency Analysis": 16300, "Error Rate by Service": 7700 },
  ],
  orgTrend: [
    { label: "Wk1", "Acme Financial": 11200, "ShopStream": 9100, "MediCore": 7400 },
    { label: "Wk2", "Acme Financial": 12800, "ShopStream": 10200,"MediCore": 8600 },
    { label: "Wk3", "Acme Financial": 14100, "ShopStream": 11000,"MediCore": 9400 },
    { label: "Wk4", "Acme Financial": 14300, "ShopStream": 10900,"MediCore": 9400 },
  ],
  callKeys:  ["aggregate spans", "get trace", "search spans", "search services"],
  themeKeys: ["Trace Investigation", "Service Latency Analysis", "Error Rate by Service"],
  orgKeys:   ["Acme Financial", "ShopStream", "MediCore"],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function genCalls()  { return _LIVE_CALLS;  }
function genThemes() { return _LIVE_THEMES; }
function genOrgs()   { return _LIVE_ORGS;   }
function genTrends() { return _LIVE_TRENDS; }

// ── React + Recharts Dashboard ───────────────────────────────────────────────
import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid, Cell,
} from "recharts";

const COLORS = [
  "#6366f1","#8b5cf6","#a78bfa","#c4b5fd","#7c3aed",
  "#4f46e5","#818cf8","#e879f9","#f472b6","#fb923c",
];

const CAT_COLOR = {
  Spans: "#6366f1", Traces: "#8b5cf6", Services: "#a78bfa",
  Metrics: "#7c3aed", "Error Tracking": "#ef4444", DBM: "#f59e0b",
  Synthetics: "#10b981", Alerting: "#3b82f6", LLMObs: "#ec4899",
  "Software Delivery": "#14b8a6",
};

const TIER_COLOR = { Enterprise: "#6366f1", Growth: "#8b5cf6", SMB: "#a78bfa" };

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function StatusBadge({ live }) {
  if (live) return <span style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>● LIVE</span>;
  return <span style={{ color: "#f97316", fontSize: 11, fontWeight: 600 }}>⚠️ est</span>;
}

function SectionHeader({ title, live }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>{title}</h3>
      <StatusBadge live={live} />
    </div>
  );
}

// ── Tab: Top Tool Calls ──────────────────────────────────────────────────────
function CallsTab() {
  const calls = genCalls();
  const total = calls.reduce((s, c) => s + c.count, 0);
  return (
    <div>
      <SectionHeader title="Top APM Tool Calls (Last 30 Days)" live={LIVE_STATUS.calls} />
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>
        Total: <strong>{fmt(total)}</strong> calls across {calls.length} tools
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={calls} layout="vertical" margin={{ left: 120, right: 40 }}>
          <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="shortName" tick={{ fontSize: 11 }} width={120} />
          <Tooltip formatter={(v) => [fmt(v), "calls"]} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {calls.map((c, i) => (
              <Cell key={i} fill={CAT_COLOR[c.category] ?? COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {[...new Set(calls.map((c) => c.category))].map((cat) => (
          <span key={cat} style={{
            background: CAT_COLOR[cat] + "22", color: CAT_COLOR[cat] ?? "#6366f1",
            border: `1px solid ${CAT_COLOR[cat] ?? "#6366f1"}44`,
            borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600,
          }}>{cat}</span>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Prompt Themes ───────────────────────────────────────────────────────
function ThemesTab() {
  const themes = genThemes();
  const total = themes.reduce((s, t) => s + t.count, 0);
  return (
    <div>
      <SectionHeader title="Top Prompt Themes (Inferred)" live={LIVE_STATUS.themes} />
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>
        {total.toLocaleString()} total theme-mapped calls
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {themes.map((t, i) => {
          const pct = Math.round((t.count / total) * 100);
          return (
            <div key={i} style={{
              background: "#f5f3ff", borderRadius: 10, padding: "12px 14px",
              border: "1px solid #ddd6fe",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>
                  {t.icon} {t.theme}
                </span>
                <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ background: "#ede9fe", borderRadius: 99, height: 6 }}>
                <div style={{
                  width: `${pct}%`, background: COLORS[i % COLORS.length],
                  height: 6, borderRadius: 99, transition: "width 0.4s",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{fmt(t.count)} calls</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Top Orgs ────────────────────────────────────────────────────────────
function OrgsTab() {
  const orgs = genOrgs();
  const total = orgs.reduce((s, o) => s + o.count, 0);
  return (
    <div>
      <SectionHeader title="Top Orgs by APM Call Volume" live={LIVE_STATUS.orgs} />
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>
        {total.toLocaleString()} calls across top {orgs.length} orgs
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={orgs} layout="vertical" margin={{ left: 110, right: 60 }}>
          <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
          <Tooltip formatter={(v) => [fmt(v), "calls"]} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {orgs.map((o, i) => (
              <Cell key={i} fill={TIER_COLOR[o.tier] ?? COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table style={{ width: "100%", marginTop: 16, fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f3ff", color: "#6d28d9" }}>
            {["Org", "Industry", "Tier", "Calls", "Top Tool"].map((h) => (
              <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map((o, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 10px", fontWeight: 600 }}>{o.name}</td>
              <td style={{ padding: "6px 10px", color: "#6b7280" }}>{o.industry}</td>
              <td style={{ padding: "6px 10px" }}>
                <span style={{
                  background: TIER_COLOR[o.tier] + "22", color: TIER_COLOR[o.tier],
                  borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 600,
                }}>{o.tier}</span>
              </td>
              <td style={{ padding: "6px 10px", fontWeight: 700, color: "#7c3aed" }}>{fmt(o.count)}</td>
              <td style={{ padding: "6px 10px", color: "#6b7280", fontStyle: "italic" }}>{o.topTool}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Trends ──────────────────────────────────────────────────────────────
function TrendsTab() {
  const { callTrend, themeTrend, orgTrend, callKeys, themeKeys, orgKeys } = genTrends();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <SectionHeader title="Tool Call Trends (Weekly)" live={LIVE_STATUS.trends} />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={callTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e7ff" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
            <Tooltip formatter={fmt} />
            <Legend />
            {callKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
                strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <SectionHeader title="Theme Trends (Weekly)" live={LIVE_STATUS.trends} />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={themeTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e7ff" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
            <Tooltip formatter={fmt} />
            <Legend />
            {themeKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
                strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <SectionHeader title="Top Org Trends (Weekly)" live={LIVE_STATUS.trends} />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={orgTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e7ff" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
            <Tooltip formatter={fmt} />
            <Legend />
            {orgKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
                strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
const TABS = ["📊 Tool Calls", "💡 Themes", "🏢 Top Orgs", "📈 Trends"];

export default function MCPDashboard() {
  const [tab, setTab] = useState(0);
  const calls = genCalls();
  const totalCalls = calls.reduce((s, c) => s + c.count, 0);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f5f3ff", minHeight: "100vh", padding: 24 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #6d28d9, #a855f7)",
        borderRadius: 16, padding: "20px 28px", marginBottom: 24, color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            Datadog MCP · APM Usage Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 13 }}>
            Last 30 days · 14 APM tools tracked · 8 toolsets (7 known APM + core)
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(totalCalls)}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>total APM calls</div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "#1 Tool",       value: calls[0]?.shortName,        sub: `${fmt(calls[0]?.count)} calls` },
          { label: "Top Theme",     value: "Trace Investigation",       sub: "🔎 most common" },
          { label: "Top Org",       value: "Acme Financial",           sub: `${fmt(52400)} calls` },
          { label: "Fastest Growth",value: "LLMObs",                   sub: "🤖 +38% WoW est." },
        ].map((k, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 12, padding: "14px 16px",
            border: "1px solid #ede9fe", boxShadow: "0 1px 4px #0000000a",
          }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: "4px 0 2px" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#7c3aed" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13, transition: "all 0.15s",
            background: tab === i ? "#7c3aed" : "#fff",
            color: tab === i ? "#fff" : "#6b7280",
            boxShadow: tab === i ? "0 2px 8px #7c3aed44" : "none",
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: 24,
        border: "1px solid #ede9fe", boxShadow: "0 2px 12px #0000000a",
      }}>
        {tab === 0 && <CallsTab />}
        {tab === 1 && <ThemesTab />}
        {tab === 2 && <OrgsTab />}
        {tab === 3 && <TrendsTab />}
      </div>

      <p style={{ textAlign: "center", color: "#c4b5fd", fontSize: 11, marginTop: 16 }}>
        ⚠️ All sections using estimated seed data — Datadog MCP server not connected to this session
      </p>
    </div>
  );
}

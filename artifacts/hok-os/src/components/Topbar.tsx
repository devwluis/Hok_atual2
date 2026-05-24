import React, { useState } from "react";
import type { AppState, View } from "@/App";
import { MODELS } from "@/lib/store";

const TABS: { id: View; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "chat",      label: "Chat" },
  { id: "terminal",  label: "Terminal" },
  { id: "skills",    label: "Skills" },
  { id: "tunnel",    label: "Tunnel" },
  { id: "config",    label: "Config" },
];

export function Topbar({ state }: { state: AppState }) {
  const { view, setView, status, model, setModel, sidebarOpen, setSidebarOpen } = state;
  const currentModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const [modelOpen, setModelOpen] = useState(false);

  return (
    <header style={{
      height: 48,
      minHeight: 48,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border)",
      position: "relative",
      zIndex: 100,
      gap: 16,
    }}>
      {/* Left: Logo + mobile toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button
          className="hok-btn ghost"
          style={{ display: "none", padding: "4px 8px", fontSize: 16 }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          id="sidebar-toggle"
        >
          ☰
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 18,
            color: "var(--accent)",
            fontFamily: "'IBM Plex Mono', monospace",
            filter: "drop-shadow(0 0 6px rgba(99,179,237,0.4))",
            lineHeight: 1,
          }}>⬡</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            HOK OS
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 2,
            padding: "1px 5px",
          }}>v4</span>
        </div>
      </div>

      {/* Center: Nav */}
      <nav style={{ display: "flex", alignItems: "flex-end", gap: 24, flex: 1, justifyContent: "center", overflowX: "auto", paddingBottom: 0, height: 48 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`hok-tab${view === tab.id || (view === "dashboard" && tab.id === "dashboard") ? " active" : ""}`}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right: Model + Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Model selector */}
        <div style={{ position: "relative" }}>
          <button
            className="hok-btn ghost"
            onClick={() => setModelOpen((v) => !v)}
            style={{ padding: "4px 10px", fontSize: 12, gap: 6 }}
          >
            <span style={{ color: "var(--accent)" }}>{currentModel.icon}</span>
            <span className="mono">{currentModel.label}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 9 }}>▾</span>
          </button>
          {modelOpen && (
            <div style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              minWidth: 200,
              zIndex: 200,
              overflow: "hidden",
            }}>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setModel(m.id); setModelOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 14px",
                    background: model === m.id ? "var(--accent-dim)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    color: model === m.id ? "var(--accent)" : "var(--text-secondary)",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => { if (model !== m.id) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { if (model !== m.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span>{m.icon}</span>
                  <span style={{ flex: 1 }}>{m.label}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{m.badge}</span>
                </button>
              ))}
            </div>
          )}
          {modelOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setModelOpen(false)} />
          )}
        </div>

        {/* Status pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 2,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.08em",
          cursor: "pointer",
        }} onClick={() => state.checkStatus()}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: status === "online" ? "var(--online)" : status === "checking" ? "var(--warning)" : "var(--offline)",
            animation: status === "online" ? "ping 2s ease-in-out infinite" : "none",
            display: "inline-block",
            flexShrink: 0,
          }} />
          <span style={{
            color: status === "online" ? "var(--online)" : status === "checking" ? "var(--warning)" : "var(--offline)",
            textTransform: "uppercase",
          }}>
            {status === "checking" ? "..." : status}
          </span>
        </div>
      </div>
    </header>
  );
}

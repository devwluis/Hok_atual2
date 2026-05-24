import React, { useState, useEffect, useRef } from "react";
import type { AppState } from "@/App";
import { apiPing } from "@/lib/store";

interface PingEntry {
  ts: number;
  latency: number | null;
  status: "ok" | "err";
  version?: string;
  uptime?: number;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function LatencyBar({ value, max = 2000 }: { value: number; max?: number }) {
  const pct = Math.min(value / max, 1);
  const color = value < 200 ? "var(--online)" : value < 800 ? "var(--warning)" : "var(--offline)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: "var(--bg-elevated)", borderRadius: 0 }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, transition: "width 300ms" }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color, minWidth: 50, textAlign: "right" }}>
        {value}ms
      </span>
    </div>
  );
}

export default function TunnelPage({ state }: { state: AppState }) {
  const { config, status } = state;
  const [pings, setPings] = useState<PingEntry[]>([]);
  const [autoPing, setAutoPing] = useState(false);
  const [pinging, setPinging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const doPing = async () => {
    if (pinging) return;
    setPinging(true);
    const start = Date.now();
    try {
      const data = await apiPing(config);
      const latency = Date.now() - start;
      setPings((p) => [{ ts: Date.now(), latency, status: "ok", version: data.version, uptime: data.uptime }, ...p.slice(0, 99)]);
    } catch {
      setPings((p) => [{ ts: Date.now(), latency: null, status: "err" }, ...p.slice(0, 99)]);
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    if (autoPing) {
      intervalRef.current = setInterval(doPing, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoPing, config]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0 });
  }, [pings.length]);

  const avgLatency = pings.filter((p) => p.latency !== null).reduce((s, p) => s + (p.latency ?? 0), 0) / (pings.filter((p) => p.latency !== null).length || 1);
  const successRate = pings.length ? Math.round(pings.filter((p) => p.status === "ok").length / pings.length * 100) : 0;
  const lastOk = pings.find((p) => p.status === "ok");

  const serverUrl = config.serverUrl;
  const isNgrok = serverUrl.includes("ngrok");
  const isCloudflare = serverUrl.includes("trycloudflare") || serverUrl.includes("cloudflare");

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Tunnel Monitor</h1>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          Diagnóstico da conexão com o HOK Server no Termux
        </p>
      </div>

      {/* Connection info */}
      <div className="hok-panel" style={{ padding: "16px 20px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 20 }}>
        <div>
          <div className="hok-label" style={{ marginBottom: 6 }}>Endpoint</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: "var(--text-primary)",
            wordBreak: "break-all",
          }}>
            {serverUrl || "—"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "2px 8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 2, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              {isNgrok ? "ngrok" : isCloudflare ? "cloudflare" : "direto"}
            </span>
            {config.token && (
              <span style={{ fontSize: 10, padding: "2px 8px", background: "var(--accent-dim)", border: "1px solid var(--border-glow)", borderRadius: 2, color: "var(--accent)", fontFamily: "'IBM Plex Mono', monospace" }}>
                token configurado
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 52,
            height: 52,
            border: `2px solid ${status === "online" ? "var(--online)" : "var(--offline)"}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}>
            <span style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: status === "online" ? "var(--online)" : status === "checking" ? "var(--warning)" : "var(--offline)",
              display: "block",
              animation: status === "online" ? "ping 2s ease-in-out infinite" : "none",
            }} />
          </div>
          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: status === "online" ? "var(--online)" : "var(--offline)", textTransform: "uppercase" }}>
            {status}
          </span>
        </div>
      </div>

      {/* Stats row */}
      {pings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Pings", value: pings.length.toString(), sub: "total" },
            { label: "Sucesso", value: `${successRate}%`, sub: `${pings.filter((p) => p.status === "ok").length} ok` },
            { label: "Latência média", value: `${Math.round(avgLatency)}ms`, sub: "por ping" },
            { label: "Versão", value: lastOk?.version ?? "—", sub: lastOk?.uptime !== undefined ? `up ${formatUptime(lastOk.uptime)}` : "—" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="stat-card" style={{ padding: "12px 16px" }}>
              <div className="hok-label">{label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          className="hok-btn primary"
          onClick={doPing}
          disabled={pinging}
          style={{ padding: "7px 18px" }}
        >
          {pinging ? "Pingando..." : "Ping agora"}
        </button>
        <button
          className={`hok-btn${autoPing ? " primary" : ""}`}
          onClick={() => setAutoPing((v) => !v)}
          style={{ padding: "7px 18px" }}
        >
          {autoPing ? "Parar auto-ping" : "Auto-ping (5s)"}
        </button>
        <button className="hok-btn ghost" onClick={() => setPings([])} style={{ padding: "7px 18px" }}>
          Limpar log
        </button>
      </div>

      {/* Ping log */}
      {pings.length > 0 && (
        <div className="hok-panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
            <span className="hok-label">Historico de pings</span>
          </div>
          <div ref={logRef} style={{ maxHeight: 320, overflowY: "auto", padding: "8px 16px" }}>
            {pings.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                }}
              >
                <span style={{ color: p.status === "ok" ? "var(--online)" : "var(--offline)", flexShrink: 0 }}>
                  {p.status === "ok" ? "✓" : "✗"}
                </span>
                <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                  {new Date(p.ts).toLocaleTimeString("pt-BR")}
                </span>
                {p.latency !== null ? (
                  <div style={{ flex: 1 }}>
                    <LatencyBar value={p.latency} />
                  </div>
                ) : (
                  <span style={{ flex: 1, color: "var(--offline)" }}>timeout / erro</span>
                )}
                {p.version && (
                  <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{p.version}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guides */}
      <div style={{ marginTop: 20 }}>
        <div className="hok-label" style={{ marginBottom: 12 }}>Guia de tunelamento</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            {
              name: "ngrok",
              color: "#4D72F9",
              cmd: "ngrok http 8081",
              note: "Copie a URL HTTPS e cole em Config → Servidor. O ngrok aviso de browser é ignorado automaticamente.",
            },
            {
              name: "Cloudflare Tunnel",
              color: "#F38020",
              cmd: "cloudflared tunnel --url http://localhost:8081",
              note: "Instale cloudflared no Termux. Tunnel gratuito, sem login.",
            },
          ].map((g) => (
            <div key={g.name} className="hok-panel" style={{ padding: "14px 16px", borderLeft: `2px solid ${g.color}` }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)", marginBottom: 6 }}>{g.name}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--accent)", background: "var(--bg-elevated)", padding: "5px 10px", borderRadius: "var(--radius)", marginBottom: 8 }}>
                $ {g.cmd}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>{g.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

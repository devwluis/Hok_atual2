import React, { useEffect, useState } from "react";
import type { AppState } from "@/App";
import { apiPing, MODELS, formatDate } from "@/lib/store";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <div className="hok-label">{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: color ?? "var(--text-primary)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ActivityRow({ conv }: { conv: { id: string; title: string; messages: { ts: number }[]; model: string; date: number } }) {
  const last = conv.messages[conv.messages.length - 1];
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "9px 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-dim)", border: "1px solid var(--border-glow)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {conv.title}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
          {conv.messages.length} mensagens · {MODELS.find((m) => m.id === conv.model)?.label ?? conv.model}
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
        {last ? formatDate(last.ts) : formatDate(conv.date)}
      </div>
    </div>
  );
}

export default function DashboardPage({ state }: { state: AppState }) {
  const { config, status, checkStatus, conversations, setView, model } = state;
  const [serverInfo, setServerInfo] = useState<{ version?: string; uptime?: number } | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await apiPing(config);
        setServerInfo(data);
      } catch { setServerInfo(null); }
    };
    fetchInfo();
  }, [config]);

  const totalMessages = conversations.reduce((s, c) => s + c.messages.length, 0);
  const avgLen = conversations.length ? Math.round(totalMessages / conversations.length) : 0;
  const currentModel = MODELS.find((m) => m.id === model);

  function formatUptime(s: number) {
    if (s < 60) return `${Math.floor(s)}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <span style={{ fontSize: 28, color: "var(--accent)", filter: "drop-shadow(0 0 8px rgba(99,179,237,0.4))", lineHeight: 1 }}>⬡</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>HOK OS</h1>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>Seu agente de IA no Termux, sempre disponível</p>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="hok-btn primary"
              onClick={() => { state.newConversation(); setView("chat"); }}
              style={{ padding: "8px 18px" }}
            >
              Nova conversa
            </button>
            <button className="hok-btn" onClick={() => setView("config")} style={{ padding: "8px 14px" }}>
              Config
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
        <StatCard
          label="Status"
          value={status === "online" ? "Online" : status === "checking" ? "..." : "Offline"}
          sub={serverInfo?.version ? `v${serverInfo.version}` : config.serverUrl}
          color={status === "online" ? "var(--online)" : "var(--offline)"}
        />
        <StatCard
          label="Uptime"
          value={serverInfo?.uptime !== undefined ? formatUptime(serverInfo.uptime) : "—"}
          sub="servidor HOK"
        />
        <StatCard
          label="Conversas"
          value={conversations.length.toString()}
          sub="no histórico"
        />
        <StatCard
          label="Mensagens"
          value={totalMessages.toString()}
          sub={`~${avgLen} por conv.`}
        />
        <StatCard
          label="Modelo"
          value={currentModel?.label ?? "—"}
          sub="ativo"
          color="var(--accent)"
        />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 24 }}>
        <div className="hok-label" style={{ marginBottom: 12 }}>Acesso rapido</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {[
            { label: "Chat IA",     desc: "Conversa com o agente",    view: "chat" as const,     icon: "◈" },
            { label: "Terminal",    desc: "Shell Termux remoto",       view: "terminal" as const,  icon: ">" },
            { label: "Skills",      desc: "Comandos salvos",           view: "skills" as const,    icon: "⬡" },
            { label: "Tunnel",      desc: "Monitor de conexão",        view: "tunnel" as const,    icon: "↔" },
          ].map((a) => (
            <button
              key={a.view}
              onClick={() => setView(a.view)}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "14px 16px",
                textAlign: "left",
                cursor: "pointer",
                transition: "border-color 120ms, background 120ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-glow)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
            >
              <div style={{ fontSize: 18, color: "var(--accent)", marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent conversations */}
      {conversations.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span className="hok-label">Conversas recentes</span>
            <div style={{ flex: 1 }} />
            <button className="hok-btn ghost" style={{ padding: "2px 10px", fontSize: 11 }} onClick={() => setView("chat")}>
              Ver todas
            </button>
          </div>
          <div className="hok-panel">
            <div style={{ padding: "4px 16px" }}>
              {conversations.slice(0, 8).map((conv) => (
                <ActivityRow key={conv.id} conv={conv} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {conversations.length === 0 && (
        <div className="hok-panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: 12, fontSize: 28 }}>◈</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Nenhuma conversa ainda. Configure o servidor e inicie um chat.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="hok-btn primary" onClick={() => setView("config")} style={{ padding: "8px 18px" }}>
              Configurar servidor
            </button>
            <button className="hok-btn" onClick={() => { state.newConversation(); setView("chat"); }} style={{ padding: "8px 18px" }}>
              Abrir chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

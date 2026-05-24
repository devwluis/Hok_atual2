import React, { useState } from "react";
import type { AppState } from "@/App";
import { MODELS, loadConversations, saveConversations } from "@/lib/store";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
        <span className="hok-label">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, alignItems: "start", marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{label}</div>
        {help && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.5 }}>{help}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage({ state }: { state: AppState }) {
  const { config, setConfig, model, setModel, checkStatus, status, conversations } = state;

  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [token, setToken] = useState(config.token);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);

  const save = () => {
    setConfig({ serverUrl: serverUrl.replace(/\/$/, ""), token });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setTimeout(() => checkStatus(), 300);
  };

  const clearHistory = () => {
    setClearing(true);
    setTimeout(() => {
      saveConversations([]);
      window.location.reload();
    }, 500);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Config</h1>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          Configurações do HOK OS e conexão com o servidor Termux
        </p>
      </div>

      {/* Server */}
      <Section title="Servidor HOK">
        <Field label="URL do servidor" help="Endereço do HOK Server no Termux (local, ngrok, ou Cloudflare)">
          <input
            className="hok-input"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:8081"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </Field>

        <Field label="Token de autenticação" help="X-HOK-TOKEN enviado em cada requisição. Deixe em branco se não configurou no servidor.">
          <input
            className="hok-input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="token secreto (opcional)"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </Field>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="hok-btn primary"
            onClick={save}
            style={{ padding: "8px 20px" }}
          >
            {saved ? "Salvo!" : "Salvar"}
          </button>
          <button
            className="hok-btn"
            onClick={() => { save(); setTimeout(checkStatus, 400); }}
            style={{ padding: "8px 16px" }}
          >
            Testar conexão
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: status === "online" ? "var(--online)" : status === "checking" ? "var(--warning)" : "var(--offline)",
              display: "inline-block",
              animation: status === "online" ? "ping 2s ease-in-out infinite" : "none",
            }} />
            <span style={{
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase",
              color: status === "online" ? "var(--online)" : status === "checking" ? "var(--warning)" : "var(--offline)",
            }}>
              {status}
            </span>
          </div>
        </div>

        {/* Endpoint reference */}
        <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div className="hok-label" style={{ marginBottom: 10 }}>Endpoints esperados no servidor</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { method: "GET",  path: "/ping",    desc: "Heartbeat → status, version, uptime" },
              { method: "POST", path: "/hok",     desc: "Chat → { message, model, history }" },
              { method: "POST", path: "/shell",   desc: "Shell → { cmd } → { output, sucesso }" },
              { method: "GET",  path: "/models",  desc: "Lista de modelos disponíveis" },
              { method: "POST", path: "/index",   desc: "Indexar codebase" },
              { method: "POST", path: "/notify",  desc: "Notificação Android" },
            ].map(({ method, path, desc }) => (
              <div key={path} style={{ display: "flex", gap: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                <span style={{ width: 36, color: method === "GET" ? "var(--online)" : "var(--accent)", flexShrink: 0 }}>{method}</span>
                <span style={{ color: "var(--text-primary)", minWidth: 80 }}>{path}</span>
                <span style={{ color: "var(--text-muted)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Model */}
      <Section title="Modelo Padrao">
        <Field label="Modelo ativo" help="Usado em novas conversas. Pode ser trocado no topo em qualquer momento.">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {MODELS.map((m) => (
              <label
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: model === m.id ? "var(--accent-dim)" : "var(--bg-elevated)",
                  border: `1px solid ${model === m.id ? "var(--border-glow)" : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  transition: "background 120ms, border-color 120ms",
                }}
              >
                <input type="radio" name="model" value={m.id} checked={model === m.id} onChange={() => setModel(m.id)} style={{ accentColor: "var(--accent)" }} />
                <span style={{ fontSize: 14, color: "var(--accent)" }}>{m.icon}</span>
                <span style={{ fontSize: 12, fontWeight: model === m.id ? 500 : 400, color: model === m.id ? "var(--text-primary)" : "var(--text-secondary)", flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-muted)" }}>{m.badge}</span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      {/* Danger zone */}
      <Section title="Zona de risco">
        <Field label="Histórico de conversas" help={`${conversations.length} conversas salvas no navegador`}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="hok-btn"
              onClick={clearHistory}
              disabled={clearing || conversations.length === 0}
              style={{
                padding: "8px 18px",
                borderColor: "rgba(252,129,129,0.3)",
                color: "var(--offline)",
              }}
            >
              {clearing ? "Limpando..." : "Limpar histórico"}
            </button>
            {conversations.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>Nenhuma conversa</span>
            )}
          </div>
        </Field>
      </Section>

      {/* About */}
      <div style={{ marginTop: 8, padding: "16px 0", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", align: "center", gap: 6, color: "var(--text-muted)", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          <span style={{ color: "var(--accent)" }}>⬡</span>
          <span>HOK OS · Obsidian Glass · Replit Agent</span>
        </div>
      </div>
    </div>
  );
}

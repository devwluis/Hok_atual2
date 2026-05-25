import React, { useEffect, useState, useRef, useCallback } from "react";
import type { AppState } from "@/App";
import {
  apiPing, apiShell, apiChatStream, orchestrateModel,
  loadSkills, saveSkills, MODELS,
  type Skill, type OrchestratorResult,
} from "@/lib/store";

// ─── Helpers ─────────────────────────────────────────────────────
function formatUptime(s: number) {
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function contextStorageKB(): number {
  try {
    const bytes = Object.keys(localStorage).reduce(
      (acc, k) => acc + (localStorage.getItem(k)?.length ?? 0) * 2,
      0,
    );
    return Math.round(bytes / 1024);
  } catch { return 0; }
}

// ─── Panel wrapper ────────────────────────────────────────────────
function Panel({ title, action, children, style }: {
  title: string; action?: React.ReactNode;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)", flexShrink: 0,
      }}>
        <span className="hok-label">{title}</span>
        {action}
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// ─── Status dot ──────────────────────────────────────────────────
function Dot({ on, pulse }: { on: boolean; pulse?: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: on ? "var(--online)" : "var(--offline)",
      animation: on && pulse ? "ping 2s ease-in-out infinite" : "none",
      flexShrink: 0,
    }} />
  );
}

// ─── STATUS PANEL ────────────────────────────────────────────────
interface DeviceInfo {
  battery: string;
  batteryStatus: string;
  wifi: string;
  wifiSignal: string;
  storage: string;
  storageUsed: string;
  cacheSize: string;
  uptime: string;
  version: string;
}

async function fetchDeviceInfo(config: AppState["config"]): Promise<Partial<DeviceInfo>> {
  const run = async (cmd: string) => {
    try {
      const r = await apiShell(config, cmd);
      return r.output.trim().split("\n")[0]?.trim() ?? "?";
    } catch { return "?"; }
  };

  const [battery, batteryStatus, wifi, storage, cacheSize] = await Promise.all([
    run(`termux-battery-status 2>/dev/null | grep -oP '"percentage":\\s*\\K\\d+' || cat /sys/class/power_supply/battery/capacity 2>/dev/null || echo "?"`),
    run(`termux-battery-status 2>/dev/null | grep -oP '"status":\\s*"\\K[^"]+' || cat /sys/class/power_supply/battery/status 2>/dev/null || echo "?"`),
    run(`termux-wifi-connectioninfo 2>/dev/null | grep -oP '"ssid":\\s*"\\K[^"]+' || echo "?"`),
    run(`df -h /sdcard 2>/dev/null | awk 'NR==2 {print $3"/"$2}' || echo "?"`),
    run(`du -sh /data/data/com.termux/cache 2>/dev/null | cut -f1 || echo "?"`),
  ]);

  return { battery, batteryStatus, wifi, storage, cacheSize };
}

function StatusPanel({ config, hokStatus, hokInfo }: {
  config: AppState["config"];
  hokStatus: AppState["status"];
  hokInfo: { version?: string; uptime?: number } | null;
}) {
  const [device, setDevice] = useState<Partial<DeviceInfo>>({});
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState<"on" | "off" | "unknown">("unknown");
  const [torchLoading, setTorchLoading] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);
  const ctxKB = contextStorageKB();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const info = await fetchDeviceInfo(config);
      setDevice(info);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { refresh(); }, []);

  const toggleTorch = async (state: "on" | "off") => {
    setTorchLoading(true);
    try {
      await apiShell(config, `termux-torch ${state}`);
      setTorch(state);
    } catch { /* ignore */ }
    setTorchLoading(false);
  };

  const clearCache = async () => {
    setCacheClearing(true);
    setCacheMsg(null);
    try {
      const r = await apiShell(config, "rm -rf /data/data/com.termux/cache/* 2>/dev/null && echo ok");
      setCacheMsg(r.sucesso ? "Cache limpo" : "Falhou");
      setTimeout(() => setCacheMsg(null), 3000);
      await refresh();
    } finally {
      setCacheClearing(false);
    }
  };

  const battRaw = parseInt(device.battery ?? "", 10);
  const battPct = isNaN(battRaw) ? 0 : battRaw;
  const battKnown = !isNaN(battRaw);
  const isCharging = (device.batteryStatus ?? "").toLowerCase().includes("charg");
  const battColor = !battKnown ? "var(--text-muted)" : battPct > 50 ? "var(--online)" : battPct > 20 ? "var(--warning)" : "var(--offline)";

  return (
    <Panel
      title="Status & Dispositivo"
      action={
        <button className="hok-btn ghost" style={{ padding: "2px 8px", fontSize: 10 }} onClick={refresh} disabled={loading}>
          {loading ? "..." : "Atualizar"}
        </button>
      }
      style={{ gridArea: "status" }}
    >
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* HOK Server status */}
        <Row icon={<Dot on={hokStatus === "online"} pulse />} label="HOK Server">
          <span style={{
            fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
            color: hokStatus === "online" ? "var(--online)" : hokStatus === "checking" ? "var(--warning)" : "var(--offline)",
          }}>
            {hokStatus.toUpperCase()}
          </span>
          {hokInfo?.version && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>v{hokInfo.version}</span>}
          {hokInfo?.uptime !== undefined && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>· {formatUptime(hokInfo.uptime)}</span>}
        </Row>

        <Divider />

        {/* WiFi */}
        <Row icon={<WifiIcon />} label="Wi-Fi">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-primary)" }}>
            {device.wifi ?? "—"}
          </span>
        </Row>

        {/* Battery */}
        <Row icon={<BatteryIcon pct={battPct} charging={isCharging} color={battColor} />} label="Bateria">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <div style={{ flex: 1, height: 5, background: "var(--bg-elevated)", borderRadius: 0, border: "1px solid var(--border)" }}>
              <div style={{ height: "100%", width: `${Math.min(battPct, 100)}%`, background: battColor, transition: "width 600ms" }} />
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: battColor, minWidth: 36 }}>
              {device.battery ?? "?"}%
            </span>
            {isCharging && <span style={{ fontSize: 10, color: "var(--warning)" }}>⚡</span>}
          </div>
        </Row>

        {/* Storage */}
        <Row icon={<StorageIcon />} label="Armazenamento">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-primary)" }}>
            {device.storage ?? "—"}
          </span>
        </Row>

        <Divider />

        {/* Lanterna */}
        <Row icon={<span style={{ fontSize: 14 }}>{torch === "on" ? "🔦" : "○"}</span>} label="Lanterna">
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="hok-btn"
              style={{
                padding: "3px 12px", fontSize: 11,
                background: torch === "on" ? "rgba(246,173,85,0.12)" : undefined,
                borderColor: torch === "on" ? "var(--warning)" : undefined,
                color: torch === "on" ? "var(--warning)" : undefined,
              }}
              onClick={() => toggleTorch("on")}
              disabled={torchLoading}
            >
              ON
            </button>
            <button
              className="hok-btn"
              style={{ padding: "3px 12px", fontSize: 11 }}
              onClick={() => toggleTorch("off")}
              disabled={torchLoading}
            >
              OFF
            </button>
          </div>
        </Row>

        {/* Cache */}
        <Row icon={<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-muted)" }}>CACHE</span>} label="Cache Termux">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-secondary)" }}>
              {device.cacheSize ?? "?"}
            </span>
            <button
              className="hok-btn"
              style={{ padding: "3px 10px", fontSize: 10 }}
              onClick={clearCache}
              disabled={cacheClearing}
            >
              {cacheClearing ? "..." : cacheMsg ?? "Limpar"}
            </button>
          </div>
        </Row>

        {/* Context storage */}
        <Row icon={<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-muted)" }}>CTX</span>} label="Contexto (local)">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <div style={{ flex: 1, height: 5, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 0 }}>
              <div style={{ height: "100%", width: `${Math.min(ctxKB / 50, 1) * 100}%`, background: "var(--accent)", transition: "width 400ms" }} />
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--accent)", minWidth: 50 }}>
              {ctxKB} KB
            </span>
          </div>
        </Row>
      </div>
    </Panel>
  );
}

function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 24 }}>
      <div style={{ width: 20, display: "flex", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 110, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border)", margin: "2px 0" }} />;
}

// ─── Simple SVG icons ────────────────────────────────────────────
function WifiIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent)" }}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}
function BatteryIcon({ pct, charging, color }: { pct: number; charging: boolean; color: string }) {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ flexShrink: 0 }}>
      <rect x="0.5" y="0.5" width="13" height="9" rx="1" stroke={color} strokeWidth="1" />
      <rect x="13.5" y="3" width="2" height="4" rx="0.5" fill={color} />
      <rect x="1.5" y="1.5" width={`${Math.min(pct / 100, 1) * 11}`} height="7" rx="0.5" fill={color} />
      {charging && <text x="4" y="8.5" fontSize="6" fill="white" fontWeight="bold">⚡</text>}
    </svg>
  );
}
function StorageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}>
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

// ─── SKILLS & CODECS PANEL ────────────────────────────────────────
function SkillsPanel({ config }: { config: AppState["config"] }) {
  const [skills] = useState<Skill[]>(() => loadSkills());
  const [running, setRunning] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, { out: string; ok: boolean }>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = async (skill: Skill) => {
    if (running || !skill.enabled) return;
    setRunning(skill.id);
    try {
      const r = await apiShell(config, skill.command);
      setOutputs((o) => ({ ...o, [skill.id]: { out: r.output.slice(0, 300), ok: r.sucesso } }));
      setExpanded(skill.id);
    } catch (e) {
      setOutputs((o) => ({ ...o, [skill.id]: { out: `Erro: ${e instanceof Error ? e.message : "?"}`, ok: false } }));
    } finally {
      setRunning(null);
    }
  };

  const enabled = skills.filter((s) => s.enabled);

  return (
    <Panel title="Skills & Codecs" action={
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {enabled.length} ativos
      </span>
    } style={{ gridArea: "skills" }}>
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
        {/* Quick codec/command chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
          {[
            { label: "uname -a",      cmd: "uname -a" },
            { label: "df -h",         cmd: "df -h /sdcard" },
            { label: "free -h",       cmd: "free -h" },
            { label: "ip addr",       cmd: "ip addr show wlan0 2>/dev/null | grep 'inet '" },
            { label: "env PATH",      cmd: "echo $PATH" },
            { label: "termux ver",    cmd: "pkg show termux-tools 2>/dev/null | grep Version || echo $(uname -r)" },
          ].map((q) => (
            <button
              key={q.label}
              className="hok-cmd"
              disabled={!!running}
              onClick={async () => {
                setRunning("_q_" + q.label);
                try {
                  const r = await apiShell(config, q.cmd);
                  setOutputs((o) => ({ ...o, ["_q_" + q.label]: { out: r.output.trim(), ok: r.sucesso } }));
                  setExpanded("_q_" + q.label);
                } finally { setRunning(null); }
              }}
              style={{ fontSize: 10 }}
            >
              {running === "_q_" + q.label ? "..." : q.label}
            </button>
          ))}
        </div>

        {/* Output box */}
        {expanded && outputs[expanded] && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            color: outputs[expanded].ok ? "var(--text-primary)" : "var(--offline)",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "8px 10px",
            whiteSpace: "pre-wrap", maxHeight: 100, overflowY: "auto",
          }}>
            {outputs[expanded].out || "(sem saída)"}
          </div>
        )}

        {/* Saved skills */}
        <div style={{ marginTop: 4 }}>
          <span className="hok-label" style={{ display: "block", marginBottom: 6 }}>Skills salvas</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {enabled.map((skill) => {
              const out = outputs[skill.id];
              const isRunning = running === skill.id;
              return (
                <div key={skill.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{skill.name}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8, fontFamily: "'IBM Plex Mono', monospace" }}>$ {skill.command.slice(0, 30)}{skill.command.length > 30 ? "…" : ""}</span>
                    </div>
                    <button
                      className="hok-btn primary"
                      style={{ padding: "3px 12px", fontSize: 10, flexShrink: 0 }}
                      onClick={() => run(skill)}
                      disabled={!!running}
                    >
                      {isRunning ? "..." : "Run"}
                    </button>
                  </div>
                  {out && expanded === skill.id && (
                    <pre style={{
                      margin: 0, fontSize: 10, color: out.ok ? "var(--text-secondary)" : "var(--offline)",
                      background: "var(--bg-deep)", border: "1px solid var(--border)",
                      borderRadius: 2, padding: "5px 8px", maxHeight: 80, overflowY: "auto",
                      whiteSpace: "pre-wrap",
                    }}>{out.out}</pre>
                  )}
                </div>
              );
            })}
            {enabled.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Nenhuma skill ativa — vá em Skills para ativar</span>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ─── MINI TERMINAL PANEL ──────────────────────────────────────────
interface TermLine { type: "cmd" | "out" | "err"; text: string }

function TerminalPanel({ config }: { config: AppState["config"] }) {
  const [lines, setLines] = useState<TermLine[]>([
    { type: "out", text: "HOK OS · Terminal Embarcado" },
    { type: "out", text: "──────────────────────────" },
  ]);
  const [input, setInput] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const run = async (cmd: string) => {
    const c = cmd.trim();
    if (!c || running) return;
    setLines((l) => [...l, { type: "cmd", text: `$ ${c}` }]);
    setHist((h) => [c, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput("");
    setRunning(true);
    try {
      const { output, sucesso } = await apiShell(config, c);
      output.trim().split("\n").forEach((t) =>
        setLines((l) => [...l, { type: sucesso ? "out" : "err", text: t }]),
      );
    } catch (e) {
      setLines((l) => [...l, { type: "err", text: `Erro: ${e instanceof Error ? e.message : "?"}` }]);
    } finally {
      setRunning(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { run(input); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); const i = Math.min(histIdx + 1, hist.length - 1); setHistIdx(i); setInput(hist[i] ?? ""); }
    if (e.key === "ArrowDown") { e.preventDefault(); const i = Math.max(histIdx - 1, -1); setHistIdx(i); setInput(i === -1 ? "" : hist[i] ?? ""); }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setLines([{ type: "out", text: "Limpo." }]); }
  };

  return (
    <Panel
      title="Terminal"
      action={
        <button className="hok-btn ghost" style={{ padding: "2px 8px", fontSize: 10 }} onClick={() => setLines([{ type: "out", text: "Limpo." }])}>
          Limpar
        </button>
      }
      style={{ gridArea: "terminal" }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 180 }}>
        {/* Output */}
        <div
          style={{ flex: 1, overflowY: "auto", padding: "8px 12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, lineHeight: 1.6, cursor: "text", maxHeight: 200 }}
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((l, i) => (
            <div key={i} style={{
              color: l.type === "cmd" ? "var(--accent)" : l.type === "err" ? "var(--offline)" : "var(--text-secondary)",
              whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>{l.text}</div>
          ))}
          {running && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
              <div className="loading-dots" style={{ display: "flex", gap: 2 }}><span /><span /><span /></div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input line */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-elevated)", flexShrink: 0 }}>
          <span style={{ color: "var(--accent)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flexShrink: 0 }}>$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={running}
            placeholder="comando..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-primary)" }}
          />
        </div>
      </div>
    </Panel>
  );
}

// ─── HOK IA PANEL ────────────────────────────────────────────────
type IAMode = "auto" | "manual";

function HokIAPanel({ state }: { state: AppState }) {
  const { config, model, setModel } = state;
  const [iaMode, setIAMode] = useState<IAMode>("auto");
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [orchResult, setOrchResult] = useState<OrchestratorResult | null>(null);
  const [selectedModel, setSelectedModel] = useState(model);
  const [modelOpen, setModelOpen] = useState(false);
  const bufRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const replyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (iaMode !== "auto" || !input.trim()) { setOrchResult(null); return; }
    const t = setTimeout(() => {
      setOrchResult(orchestrateModel(input.trim(), []));
    }, 300);
    return () => clearTimeout(t);
  }, [input, iaMode]);

  useEffect(() => { replyRef.current?.scrollTo({ top: replyRef.current.scrollHeight }); }, [reply]);

  const cancel = () => {
    abortRef.current?.abort();
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStreaming(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    let activeModel = selectedModel;
    let orch: OrchestratorResult | null = null;
    if (iaMode === "auto") {
      orch = orchestrateModel(text, []);
      activeModel = orch.modelId;
      setOrchResult(orch);
      setModel(activeModel);
    }

    setInput("");
    setReply("");
    bufRef.current = "";
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    await apiChatStream(
      config,
      [{ role: "user", content: text }],
      activeModel,
      (token) => {
        bufRef.current += token;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            setReply(bufRef.current);
            rafRef.current = null;
          });
        }
      },
      () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        setReply(bufRef.current);
        setStreaming(false);
        abortRef.current = null;
      },
      (err) => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        setReply(bufRef.current || `Erro: ${err}`);
        setStreaming(false);
        abortRef.current = null;
      },
      ctrl.signal,
    );
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];

  return (
    <Panel title="HOK IA" style={{ gridArea: "hok-ia" }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Mode + model bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap", gap: 6 }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {(["auto", "manual"] as IAMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setIAMode(m)}
                style={{
                  padding: "4px 12px", fontSize: 11,
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: iaMode === m ? "var(--accent-dim)" : "transparent",
                  color: iaMode === m ? "var(--accent)" : "var(--text-muted)",
                  border: "none", borderRight: m === "auto" ? "1px solid var(--border)" : "none",
                  cursor: "pointer", transition: "background 120ms, color 120ms",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}
              >
                {m === "auto" ? "⬡ Auto" : "◈ Manual"}
              </button>
            ))}
          </div>

          {/* Model selector (manual only) */}
          {iaMode === "manual" && (
            <div style={{ position: "relative" }}>
              <button
                className="hok-btn ghost"
                onClick={() => setModelOpen((v) => !v)}
                style={{ padding: "3px 10px", fontSize: 11, gap: 5 }}
              >
                <span style={{ color: "var(--accent)" }}>{currentModel.icon}</span>
                <span className="mono" style={{ fontSize: 11 }}>{currentModel.label}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 9 }}>▾</span>
              </button>
              {modelOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setModelOpen(false)} />
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", minWidth: 180, zIndex: 200, overflow: "hidden" }}>
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModel(m.id); setModel(m.id); setModelOpen(false); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                          background: selectedModel === m.id ? "var(--accent-dim)" : "transparent",
                          border: "none", borderBottom: "1px solid var(--border)",
                          color: selectedModel === m.id ? "var(--accent)" : "var(--text-secondary)",
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: "pointer", textAlign: "left",
                        }}
                        onMouseEnter={(e) => { if (selectedModel !== m.id) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { if (selectedModel !== m.id) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>{m.icon}</span>
                        <span style={{ flex: 1 }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Auto indicator */}
          {iaMode === "auto" && orchResult && (
            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "var(--accent)" }}>
              <span>⬡ {orchResult.label}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: 5 }}>· {orchResult.reason}</span>
            </span>
          )}
          {iaMode === "auto" && !orchResult && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>IA será escolhida automaticamente</span>
          )}
        </div>

        {/* Reply box */}
        {reply && (
          <div
            ref={replyRef}
            style={{
              flex: 1, overflowY: "auto", padding: "10px 14px",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
              color: "var(--text-secondary)", lineHeight: 1.7,
              whiteSpace: "pre-wrap", maxHeight: 180,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {reply}
            {streaming && (
              <span style={{ display: "inline-block", width: 7, height: 13, background: "var(--accent)", verticalAlign: "text-bottom", marginLeft: 2, borderRadius: 1, animation: "blink 1s step-end infinite" }} />
            )}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: "flex", gap: 6, padding: "8px 12px", alignItems: "flex-end", flexShrink: 0 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            placeholder={streaming ? "Aguardando..." : iaMode === "auto" ? "Mensagem... (HOK escolhe a IA)" : "Mensagem..."}
            rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{
              flex: 1, background: "var(--bg-elevated)", border: `1px solid ${streaming ? "var(--border-glow)" : "var(--border)"}`,
              borderRadius: "var(--radius)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif",
              fontSize: 12, resize: "none", outline: "none", padding: "7px 10px", lineHeight: 1.5, transition: "border-color 160ms",
            }}
            onInput={(e) => {
              const el = e.currentTarget; el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 100) + "px";
            }}
          />
          {streaming ? (
            <button className="hok-btn" onClick={cancel} style={{ padding: "6px 12px", fontSize: 11, borderColor: "var(--offline)", color: "var(--offline)", alignSelf: "flex-end" }}>Cancelar</button>
          ) : (
            <button className="hok-btn primary" onClick={send} disabled={!input.trim()} style={{ padding: "6px 14px", fontSize: 11, alignSelf: "flex-end" }}>Enviar</button>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────
export default function DashboardPage({ state }: { state: AppState }) {
  const { config } = state;
  const [hokInfo, setHokInfo] = useState<{ version?: string; uptime?: number } | null>(null);

  useEffect(() => {
    apiPing(config).then(setHokInfo).catch(() => setHokInfo(null));
  }, [config]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      {/* Page title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20, color: "var(--accent)", filter: "drop-shadow(0 0 6px rgba(99,179,237,0.4))", lineHeight: 1 }}>⬡</span>
        <div>
          <h1 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>HOK OS · IDE Dashboard</h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Controle completo do dispositivo Termux em tempo real</p>
        </div>
      </div>

      {/* Grid layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gridTemplateRows: "auto auto auto",
        gridTemplateAreas: `
          "status   skills"
          "status   terminal"
          "hok-ia   hok-ia"
        `,
        gap: 12,
        minHeight: 0,
      }}>
        <StatusPanel config={config} hokStatus={state.status} hokInfo={hokInfo} />
        <SkillsPanel config={config} />
        <TerminalPanel config={config} />
        <HokIAPanel state={state} />
      </div>

      <style>{`
        @media (max-width: 720px) {
          .dash-grid {
            grid-template-columns: 1fr !important;
            grid-template-areas: "status" "skills" "terminal" "hok-ia" !important;
          }
        }
      `}</style>
    </div>
  );
}

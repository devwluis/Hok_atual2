import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Battery, Clock, Eraser, History, Lightbulb, Radio,
  RefreshCw, Send, Server, ShieldCheck, Terminal, Trash2, Zap,
} from "lucide-react";

const CONFIG_KEY = "hokma_mobile_engine_config";
const HOK_CONFIG_KEY = "hokma_hok_config";
const HISTORY_KEY = "hokma_dashboard_history";
const DEFAULT_ENDPOINT = "http://10.168.212.48:18800/v1/chat/completions";
const DEFAULT_HOK_URL = "http://bore.pub:35798/hok";
const DEFAULT_HOK_TOKEN = "W@sh1ngt0nJarvis2026#";

type HistoryEntry = {
  id: string;
  command: string;
  reply: string;
  timestamp: string;
  status: "ok" | "error";
  via: "hok" | "hokclaw";
};

function loadEndpoint() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_ENDPOINT;
    return JSON.parse(raw).endpoint || DEFAULT_ENDPOINT;
  } catch { return DEFAULT_ENDPOINT; }
}

function loadModel() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return "llama-3.1-8b-instant";
    return JSON.parse(raw).model || "llama-3.1-8b-instant";
  } catch { return "llama-3.1-8b-instant"; }
}

function loadHokConfig() {
  try {
    const raw = localStorage.getItem(HOK_CONFIG_KEY);
    if (!raw) return { hokUrl: DEFAULT_HOK_URL, hokToken: DEFAULT_HOK_TOKEN };
    const p = JSON.parse(raw);
    return {
      hokUrl: p.hokUrl || DEFAULT_HOK_URL,
      hokToken: p.hokToken || DEFAULT_HOK_TOKEN,
    };
  } catch { return { hokUrl: DEFAULT_HOK_URL, hokToken: DEFAULT_HOK_TOKEN }; }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch { return []; }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 60)));
}

function normalizeEndpoint(endpoint: string) {
  const cleaned = endpoint.trim().replace(/\/$/, "");
  if (!cleaned) return DEFAULT_ENDPOINT;
  if (cleaned.endsWith("/v1/chat/completions")) return cleaned;
  return `${cleaned}/v1/chat/completions`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function DashboardPage() {
  const [endpoint, setEndpoint] = useState(() => loadEndpoint());
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<string[]>(() => ["[BOOT] Dashboard HokClaw iniciado", "[INFO] Aguardando ordem do operador"]);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const model = loadModel();
  const hokConfig = loadHokConfig();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hokclaw_theme") || "dark";
    document.documentElement.classList.toggle("dark", stored === "dark");
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const appendLog = (line: string) => {
    setLogs((current) => [`[${new Date().toLocaleTimeString("pt-BR")}] ${line}`, ...current].slice(0, 50));
  };

  const addToHistory = (entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 60));
  };

  const sendOrder = async (order: string) => {
    const finalOrder = order.trim();
    if (!finalOrder) return;
    setStatus("sending");
    appendLog(`[ENVIANDO] ${finalOrder.slice(0, 80)}${finalOrder.length > 80 ? "…" : ""}`);

    const entryId = Math.random().toString(36).slice(2);
    let via: "hok" | "hokclaw" = "hok";

    try {
      let reply = "";

      // Prefer HOK Tunnel if configured
      const hokUrl = hokConfig.hokUrl.trim();
      if (hokUrl) {
        via = "hok";
        const response = await fetch(hokUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-HOK-TOKEN": hokConfig.hokToken.trim() || DEFAULT_HOK_TOKEN,
          },
          body: JSON.stringify({ message: finalOrder }),
        });
        if (!response.ok) throw new Error(`HOK HTTP ${response.status}`);
        const data = await response.json() as { reply?: string };
        reply = data.reply || "Ordem recebida pelo orquestrador HOK.";
      } else {
        // Fallback: direct HokClaw endpoint
        via = "hokclaw";
        const response = await fetch(normalizeEndpoint(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            max_tokens: 500,
            messages: [
              { role: "system", content: "Voce e o executor seguro HokClaw. Receba ordens do dashboard, responda de forma curta e indique se precisa de permissao antes de controlar dispositivo." },
              { role: "user", content: `Ordem do dashboard: ${finalOrder}` },
            ],
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as { choices?: { message?: { content?: string } }[]; message?: string };
        reply = data.choices?.[0]?.message?.content || data.message || "Ordem recebida pelo servidor.";
      }

      setStatus("ok");
      appendLog(`[OK] ${reply.slice(0, 120)}${reply.length > 120 ? "…" : ""}`);
      addToHistory({ id: entryId, command: finalOrder, reply, timestamp: new Date().toISOString(), status: "ok", via });
      setCommand("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      setStatus("error");
      appendLog(`[ERRO] ${message}`);
      addToHistory({ id: entryId, command: finalOrder, reply: message, timestamp: new Date().toISOString(), status: "error", via });
    }
  };

  const resendCommand = (cmd: string) => {
    setCommand(cmd);
    setActiveTab("log");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const quickActions = [
    { label: "Ligar lanterna", icon: Lightbulb, command: "Ligar lanterna do celular se a permissao estiver autorizada" },
    { label: "Status da bateria", icon: Battery, command: "Verificar status da bateria do celular" },
    { label: "Seguranca do sistema", icon: ShieldCheck, command: "Executar diagnostico de seguranca do sistema e listar riscos" },
    { label: "Limpeza de cache", icon: Eraser, command: "Preparar limpeza segura de cache e explicar antes de executar" },
  ];

  const hokActive = !!hokConfig.hokUrl.trim();

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_36%),radial-gradient(circle_at_bottom_right,hsl(30_80%_40%/0.10),transparent_32%)]" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 py-4">

        <header className="mb-4 flex items-center justify-between gap-3">
          <Link href="/">
            <Button variant="ghost" className="gap-2 rounded-full border border-border bg-card/70">
              <ArrowLeft className="h-4 w-4" />
              Chat
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {hokActive && (
              <Badge variant="outline" className="rounded-full border-primary/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                HOK Tunnel
              </Badge>
            )}
            <Badge variant="outline" className="rounded-full border-primary/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary inline-block" />
              Dashboard Hok
            </Badge>
          </div>
        </header>

        <main className="grid flex-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">

          {/* LEFT: Command panel */}
          <section className="glass-panel relative overflow-hidden rounded-[2rem] border border-primary/20 p-5 shadow-[0_24px_90px_hsl(var(--primary)/0.14)]">
            <div className="absolute right-[-70px] top-[-80px] h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-4">
                <div className="dna-orbit" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Hok Control HUD</p>
                  <h1 className="text-3xl font-bold tracking-[-0.07em]">Painel de ordens</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hokActive ? `Via HOK Tunnel · ${hokConfig.hokUrl.replace("http://", "").split("/")[0]}` : "Via HokClaw local"}
                  </p>
                </div>
              </div>

              {/* Endpoint (only if no HOK tunnel) */}
              {!hokActive && (
                <div className="grid gap-2 rounded-[1.5rem] border border-border bg-background/55 p-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Endpoint do servidor</label>
                  <div className="flex gap-2">
                    <input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <Button type="button" variant="outline" className="rounded-2xl" onClick={() => appendLog(`[IP SET] ${endpoint}`)}>
                      Salvar
                    </Button>
                  </div>
                </div>
              )}

              {/* Command textarea */}
              <div className="grid gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Comando para o Hok</label>
                <textarea
                  ref={textareaRef}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendOrder(command); } }}
                  placeholder="Digite uma ordem segura para o HokClaw..."
                  className="min-h-28 resize-none rounded-[1.5rem] border border-border bg-card p-4 text-sm leading-6 outline-none focus:border-primary"
                />
                <Button
                  disabled={status === "sending" || !command.trim()}
                  onClick={() => sendOrder(command)}
                  className="h-12 gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-semibold"
                >
                  {status === "sending" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {status === "sending" ? "Enviando..." : "Enviar ordem"}
                </Button>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => sendOrder(action.command)}
                      disabled={status === "sending"}
                      className="rounded-2xl border border-border bg-card/80 p-3 text-left transition-all hover:border-primary/40 hover:bg-secondary active:scale-[0.98] disabled:opacity-50"
                    >
                      <Icon className="mb-3 h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold">{action.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Enviar comando</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* RIGHT: Log + History */}
          <section className="flex flex-col gap-4">
            {/* Status mini cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[1.5rem] border border-border bg-card/80 p-3 backdrop-blur-xl">
                <Server className="mb-2 h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rota</p>
                <p className="mt-0.5 text-sm font-medium truncate">{hokActive ? "HOK Tunnel" : "HokClaw"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-card/80 p-3 backdrop-blur-xl">
                <Radio className="mb-2 h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
                <p className={`mt-0.5 text-sm font-medium ${status === "error" ? "text-red-400" : status === "ok" ? "text-emerald-400" : status === "sending" ? "text-primary" : "text-muted-foreground"}`}>
                  {status === "sending" ? "enviando" : status}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 flex flex-col rounded-[2rem] border border-border bg-card/80 overflow-hidden backdrop-blur-xl shadow-sm">
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("log")}
                  className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-medium uppercase tracking-wide transition-all ${activeTab === "log" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  Log stream
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-medium uppercase tracking-wide transition-all ${activeTab === "history" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <History className="h-3.5 w-3.5" />
                  Historico
                  {history.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">{history.length}</span>
                  )}
                </button>
              </div>

              {/* LOG TAB */}
              {activeTab === "log" && (
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs min-h-[320px] max-h-[480px]">
                  <div className="mb-3 flex items-center gap-2 text-primary">
                    <Zap className="h-4 w-4" />
                    <span className="uppercase tracking-[0.2em]">Log Stream</span>
                  </div>
                  <div className="space-y-2">
                    {logs.map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className={
                          line.includes("[ERRO]")
                            ? "text-red-400"
                            : line.includes("[OK]")
                              ? "text-emerald-400"
                              : line.includes("[ENVIANDO]")
                                ? "text-primary"
                                : "text-foreground/60"
                        }
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === "history" && (
                <div className="flex flex-col flex-1 min-h-[320px] max-h-[480px]">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">{history.length} entradas</span>
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <History className="mb-3 h-8 w-8 opacity-30" />
                        <p className="text-sm">Nenhum comando enviado ainda.</p>
                        <p className="mt-1 text-xs opacity-70">Os comandos aparecem aqui apos o envio.</p>
                      </div>
                    ) : (
                      history.map((entry) => (
                        <div key={entry.id} className="group px-4 py-3 hover:bg-secondary/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${entry.status === "ok" ? "bg-emerald-400" : "bg-red-400"}`} />
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDate(entry.timestamp)} {formatTime(entry.timestamp)}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 font-mono uppercase">
                                  {entry.via}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground leading-5 line-clamp-2">
                                {entry.command}
                              </p>
                              <p className={`mt-1 text-xs leading-4 line-clamp-2 ${entry.status === "error" ? "text-red-400/80" : "text-muted-foreground"}`}>
                                {entry.reply}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => resendCommand(entry.command)}
                              className="shrink-0 flex items-center gap-1 rounded-xl border border-border bg-card/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 hover:border-primary/40 hover:text-primary transition-all"
                              title="Reenviar este comando"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Reenviar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Battery, Eraser, Lightbulb, Lock, Radio, Send, Server, ShieldCheck, Terminal, Zap } from "lucide-react";

const CONFIG_KEY = "hokma_mobile_engine_config";
const DEFAULT_ENDPOINT = "http://10.168.212.48:18800/v1/chat/completions";

function loadEndpoint() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_ENDPOINT;
    const parsed = JSON.parse(raw);
    return parsed.endpoint || DEFAULT_ENDPOINT;
  } catch {
    return DEFAULT_ENDPOINT;
  }
}

function normalizeEndpoint(endpoint: string) {
  const cleaned = endpoint.trim().replace(/\/$/, "");
  if (!cleaned) return DEFAULT_ENDPOINT;
  if (cleaned.endsWith("/v1/chat/completions")) return cleaned;
  return `${cleaned}/v1/chat/completions`;
}

function getModel() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return "llama-3.1-8b-instant";
    const parsed = JSON.parse(raw);
    return parsed.model || "llama-3.1-8b-instant";
  } catch {
    return "llama-3.1-8b-instant";
  }
}

export default function DashboardPage() {
  const [endpoint, setEndpoint] = useState(() => loadEndpoint());
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<string[]>(() => ["[BOOT] Dashboard HokClaw iniciado", "[INFO] Aguardando ordem do operador"]);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const model = useMemo(() => getModel(), []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const appendLog = (line: string) => {
    setLogs((current) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...current].slice(0, 30));
  };

  const sendOrder = async (order: string) => {
    const finalOrder = order.trim();
    if (!finalOrder) return;
    setStatus("sending");
    appendLog(`[ENVIANDO] ${finalOrder}`);
    try {
      const response = await fetch(normalizeEndpoint(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: "Voce e o executor seguro HokClaw. Receba ordens do dashboard, responda de forma curta e indique se precisa de permissao antes de controlar dispositivo.",
            },
            {
              role: "user",
              content: `Ordem do dashboard: ${finalOrder}`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || data.message || "Ordem recebida pelo servidor.";
      setStatus("ok");
      appendLog(`[OK] ${reply}`);
      setCommand("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      setStatus("error");
      appendLog(`[ERRO] ${message}. Verifique CORS, porta 18800 e servidor HokClaw ativo.`);
    }
  };

  const quickActions = [
    { label: "Ligar lanterna", icon: Lightbulb, command: "Ligar lanterna do celular se a permissao estiver autorizada" },
    { label: "Status da bateria", icon: Battery, command: "Verificar status da bateria do celular" },
    { label: "Seguranca do sistema", icon: ShieldCheck, command: "Executar diagnostico de seguranca do sistema e listar riscos" },
    { label: "Limpeza de cache", icon: Eraser, command: "Preparar limpeza segura de cache e explicar antes de executar" },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_36%),radial-gradient(circle_at_bottom_right,hsl(260_90%_60%/0.16),transparent_32%)]" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 py-4">
        <header className="mb-4 flex items-center justify-between gap-3">
          <Link href="/">
            <Button variant="ghost" className="gap-2 rounded-full border border-border bg-card/70">
              <ArrowLeft className="h-4 w-4" />
              Chat
            </Button>
          </Link>
          <Badge variant="outline" className="rounded-full border-primary/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary" />
            Dashboard Hok
          </Badge>
        </header>

        <main className="grid flex-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="glass-panel relative overflow-hidden rounded-[2rem] border border-primary/20 p-5 shadow-[0_24px_90px_rgba(8,145,178,0.16)]">
            <div className="absolute right-[-70px] top-[-80px] h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-4">
                <div className="dna-orbit" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Hok Control HUD</p>
                  <h1 className="text-3xl font-bold tracking-[-0.07em]">Painel de ordens do Hok</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Envie comandos para o servidor HokClaw ou use ações rápidas.</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-border bg-background/55 p-3">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Endpoint do servidor</label>
                <div className="flex gap-2">
                  <input
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
                  />
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={() => appendLog(`[IP SET] ${endpoint}`)}>
                    Salvar
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Comando para o Hok</label>
                <textarea
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  placeholder="Digite uma ordem segura para o HokClaw..."
                  className="min-h-32 resize-none rounded-[1.5rem] border border-border bg-card p-4 text-sm leading-6 outline-none focus:border-primary"
                />
                <Button disabled={status === "sending"} onClick={() => sendOrder(command)} className="h-12 gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Send className="h-4 w-4" />
                  Enviar ordem
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.label} onClick={() => sendOrder(action.command)} className="rounded-2xl border border-border bg-card/80 p-3 text-left transition-all hover:border-primary/40 hover:bg-secondary active:scale-[0.98]">
                      <Icon className="mb-3 h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold">{action.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Enviar comando</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="rounded-[2rem] border border-border bg-card/80 p-4 shadow-sm backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Status</p>
                  <h2 className="text-xl font-bold">Terminal visual</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Terminal className="h-5 w-5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl border border-border bg-background p-3">
                  <Server className="mb-2 h-4 w-4 text-primary" />
                  <p className="font-semibold">Modelo</p>
                  <p className="truncate text-muted-foreground">{model}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3">
                  <Radio className="mb-2 h-4 w-4 text-primary" />
                  <p className="font-semibold">Conexão</p>
                  <p className={status === "error" ? "text-red-400" : status === "ok" ? "text-emerald-400" : "text-muted-foreground"}>{status}</p>
                </div>
              </div>
            </div>

            <div className="min-h-[360px] rounded-[2rem] border border-border bg-slate-950 p-4 font-mono text-xs text-cyan-100 shadow-[0_24px_90px_rgba(8,145,178,0.16)]">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Zap className="h-4 w-4" />
                LOG STREAM
              </div>
              <div className="space-y-2">
                {logs.map((line, index) => (
                  <p key={`${line}-${index}`} className={line.includes("[ERRO]") ? "text-red-300" : line.includes("[OK]") ? "text-emerald-300" : "text-cyan-100/80"}>{line}</p>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

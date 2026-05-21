import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useChat, MODEL_OPTIONS } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { AgentSwitcher } from "@/components/agent-switcher";
import { SettingsDrawer } from "@/components/settings-drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bot, Braces, Check, ChevronDown, Cpu, Eye, EyeOff, FileText, Menu, Moon, Network, PanelLeft, Plus, Radio, ShieldCheck, Sparkles, Sun, Terminal, UploadCloud, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function HokmaLogo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className={cn("flex items-center gap-3", size === "sm" && "gap-2")}>
      <img
        src="/hokma-logo.png"
        alt="Hokmá"
        className={cn("rounded-2xl object-cover border border-primary/20 shadow-lg shadow-primary/10", size === "sm" ? "h-9 w-9" : "h-12 w-12")}
      />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">Hokmá</p>
        <h1 className={cn("font-bold tracking-tight", size === "sm" ? "text-base" : "text-lg")}>Hokmá AI Agent</h1>
      </div>
    </div>
  );
}

function QuickModelSwitcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = MODEL_OPTIONS.find((m) => m.id === value) || MODEL_OPTIONS[0];
  const hokModels = MODEL_OPTIONS.filter((m) => !m.id.includes("/"));
  const orModels = MODEL_OPTIONS.filter((m) => m.id.includes("/"));
  const isOr = current.id.includes("/");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 max-w-[108px] gap-1 rounded-full border bg-card/70 px-2.5 text-[11px] font-medium",
            isOr ? "border-violet-400/40 text-violet-300" : "border-primary/30 text-primary"
          )}
        >
          <Cpu className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{current.label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-3xl border-border bg-card p-0">
        <div className="sticky top-0 rounded-t-3xl bg-card px-4 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          <SheetTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-primary" />
            Selecionar modelo
          </SheetTitle>
          <SheetDescription className="text-xs">Cerebro para este chat — mude a qualquer momento</SheetDescription>
        </div>

        <div className="overflow-y-auto px-4 pb-8 space-y-5">
          {/* HOK / DeepSeek group */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">HOK / DeepSeek (via Termux)</p>
            </div>
            <div className="space-y-1.5">
              {hokModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => { onChange(model.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition-all active:scale-[0.98]",
                    value === model.id ? "border-amber-400/40 bg-amber-400/10" : "border-border bg-secondary/30 hover:border-amber-400/30"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                    <img src="/hokma-logo.png" alt="" className="h-6 w-6 rounded-lg object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{model.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{model.description}</p>
                  </div>
                  {value === model.id && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* OpenRouter group */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">OpenRouter (requer chave API)</p>
            </div>
            <div className="space-y-1.5">
              {orModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => { onChange(model.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition-all active:scale-[0.98]",
                    value === model.id ? "border-violet-400/40 bg-violet-400/10" : "border-border bg-secondary/30 hover:border-violet-400/30"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-400">
                    <Network className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{model.label}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{model.provider}</p>
                  </div>
                  {value === model.id && <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SidebarContent({ onNewChat }: { onNewChat: () => void }) {
  const items = [
    { icon: Bot, title: "Chat principal", text: "Hokmá como cerebro" },
    { icon: FileText, title: "Leitura de arquivos", text: "txt, codigo, json, csv" },
    { icon: Network, title: "Automacao", text: "Termux, PC e mobile" },
  ];

  return (
    <div className="flex h-full flex-col gap-5">
      <HokmaLogo />
      <Button onClick={onNewChat} className="h-11 justify-start gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <Plus className="h-4 w-4" />
        Novo chat
      </Button>
      <Link href="/dashboard">
        <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-2xl">
          <Terminal className="h-4 w-4" />
          Dashboard Hokmá
        </Button>
      </Link>
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Modulos</p>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-border bg-secondary/45 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto rounded-3xl border border-primary/20 bg-primary/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Servidor</p>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">Use o Hokmá local ou o tunel HOK como roteador para modelos DeepSeek, OpenAI, Anthropic, Gemini e Groq.</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    sendMessage,
    activeAgent,
    setActiveAgent,
    clearChat,
    engineConfig,
    setEngineConfig,
    hokConfig,
    setHokConfig,
    connectionStatus,
    connectionError,
    hokTunnelStatus,
    openrouterStatus,
    testConnection,
    testHokTunnel,
    validateOpenrouterKey,
  } = useChat();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("hokclaw_theme") || "dark");

  // Login panel state
  const [loginUrl, setLoginUrl] = useState(() => hokConfig.hokUrl);
  const [loginToken, setLoginToken] = useState(() => hokConfig.hokToken);
  const [showLoginToken, setShowLoginToken] = useState(false);
  const [loginSaved, setLoginSaved] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("hokclaw_theme", theme);
  }, [theme]);

  const hasConversation = messages.some((message) => message.role === "user");

  useEffect(() => {
    if (scrollRef.current && hasConversation) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming, hasConversation]);

  const selectedModel = useMemo(() => MODEL_OPTIONS.find((model) => model.id === engineConfig.model) || MODEL_OPTIONS[0], [engineConfig.model]);

  const statusText = engineConfig.mode === "preview"
    ? "Preview"
    : connectionStatus === "offline"
      ? "Offline"
      : connectionStatus === "testing"
        ? "Testando"
        : "Hokmá";

  const quickCommands = [
    { icon: UploadCloud, label: "Ler arquivo", cmd: "Explique como voce vai interpretar arquivos anexados e quais formatos consegue usar agora." },
    { icon: Braces, label: "Criar codigo", cmd: "Atue como Coder e crie um plano tecnico para evoluir o Hokmá com leitura de arquivos e imagens." },
    { icon: Zap, label: "Automacao segura", cmd: "Desenhe um fluxo seguro para controlar celular e PC usando o Hokmá, com permissoes claras." },
  ];

  const saveLogin = () => {
    setHokConfig({ ...hokConfig, hokUrl: loginUrl.trim(), hokToken: loginToken.trim() });
    setLoginSaved(true);
    setTimeout(() => setLoginSaved(false), 2000);
  };

  const hokActive = !!hokConfig.hokUrl.trim();

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(30_80%_40%/0.08),transparent_28%)]" />

      <aside className="relative z-10 hidden w-[292px] shrink-0 border-r border-border bg-sidebar/80 p-4 text-sidebar-foreground backdrop-blur-2xl lg:block">
        <SidebarContent onNewChat={clearChat} />
      </aside>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/76 px-3 py-3 backdrop-blur-2xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border bg-card/70 lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[310px] border-border bg-sidebar p-4 text-sidebar-foreground">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu Hokmá</SheetTitle>
                  <SheetDescription>Navegacao e modulos do Hokmá</SheetDescription>
                </SheetHeader>
                <SidebarContent onNewChat={clearChat} />
              </SheetContent>
            </Sheet>
            <AgentSwitcher activeAgent={activeAgent} setActiveAgent={setActiveAgent} />
            <QuickModelSwitcher
              value={engineConfig.model}
              onChange={(model) => setEngineConfig({ ...engineConfig, model })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("hidden rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] sm:inline-flex", connectionStatus === "offline" ? "border-red-500/30 text-red-500" : "border-primary/30 text-primary")}>
              <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", connectionStatus === "offline" ? "bg-red-500" : connectionStatus === "testing" ? "bg-amber-400" : "bg-primary")} />
              {statusText}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-10 w-10 rounded-full border border-border bg-card/70">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <SettingsDrawer
              onClearChat={clearChat}
              engineConfig={engineConfig}
              setEngineConfig={setEngineConfig}
              connectionStatus={connectionStatus}
              connectionError={connectionError}
              testConnection={testConnection}
              hokConfig={hokConfig}
              setHokConfig={setHokConfig}
              hokTunnelStatus={hokTunnelStatus}
              openrouterStatus={openrouterStatus}
              testHokTunnel={testHokTunnel}
              validateOpenrouterKey={validateOpenrouterKey}
            />
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col">
            {!hasConversation && (
              <section className="flex min-h-full flex-col justify-end gap-4 pb-4 pt-6">

                {/* Hero card */}
                <div className="glass-panel relative overflow-hidden rounded-[2rem] border border-primary/20 p-5 shadow-[0_24px_90px_hsl(var(--primary)/0.14)]">
                  <div className="absolute right-[-60px] top-[-70px] h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <HokmaLogo />
                      <div className="hidden rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.24em] text-primary sm:block">
                        Mobile first
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary/80">Hokmá Command Stream</p>
                      <h2 className="text-3xl font-semibold tracking-[-0.07em] sm:text-4xl">
                        Chat agentico para arquivos, modelos e automacao real.
                      </h2>
                      <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                        Use o Hokmá como cerebro, alterne agentes especializados, escolha modelos e envie arquivos de desenvolvimento ou imagens como contexto.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: ShieldCheck, label: "Seguro" },
                        { icon: Cpu, label: "Modelos" },
                        { icon: PanelLeft, label: "Agentes" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="rounded-2xl border border-border bg-background/45 px-3 py-3 text-center">
                            <Icon className="mx-auto mb-2 h-4 w-4 text-primary" />
                            <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* LOGIN PANEL — Túnel + Token */}
                <div className="rounded-[1.75rem] border border-primary/30 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
                  <div className="mb-4 flex items-center gap-3">
                    <img src="/hokma-logo.png" alt="Hokmá" className="h-8 w-8 rounded-xl object-cover border border-primary/20" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Conexao Hokmá</p>
                      <p className="text-xs text-muted-foreground">Configure o tunel e o token de acesso</p>
                    </div>
                    {hokActive && (
                      <span className="ml-auto flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Ativo
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em]">URL do Tunel</label>
                      <input
                        value={loginUrl}
                        onChange={(e) => setLoginUrl(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                        placeholder="http://bore.pub:35798/hok"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em]">Token Backend</label>
                      <div className="relative">
                        <input
                          value={loginToken}
                          onChange={(e) => setLoginToken(e.target.value)}
                          type={showLoginToken ? "text" : "password"}
                          className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                          placeholder="X-HOK-TOKEN"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginToken((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showLoginToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={saveLogin}
                      className="w-full h-11 gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                    >
                      {loginSaved ? (
                        <>
                          <Check className="h-4 w-4" />
                          Salvo com sucesso
                        </>
                      ) : (
                        "Salvar conexao"
                      )}
                    </Button>
                  </div>
                </div>

                {/* Model + quick commands */}
                <div className="grid gap-3 rounded-[1.75rem] border border-border bg-card/70 p-3 shadow-sm backdrop-blur-xl">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Modelo</p>
                      <Select value={engineConfig.model} onValueChange={(model) => setEngineConfig({ ...engineConfig, model })}>
                        <SelectTrigger className="h-11 rounded-2xl border-border bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>{model.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Rota ativa</p>
                      <p className="mt-1 truncate text-sm font-medium">{selectedModel.provider}</p>
                      <p className="text-xs text-muted-foreground">{selectedModel.description}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  {quickCommands.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button key={cmd.label} onClick={() => sendMessage(cmd.cmd)} className="group flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-3 text-left text-sm shadow-sm transition-all hover:border-primary/40 hover:bg-secondary active:scale-[0.98]">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </span>
                        <span className="flex-1">
                          <span className="block font-semibold">{cmd.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">Enviar para {activeAgent.name}</span>
                        </span>
                        <Radio className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {hasConversation && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-primary/30 text-primary">{activeAgent.name}</Badge>
                <Badge variant="outline" className="rounded-full">{selectedModel.label}</Badge>
              </div>
            )}

            {(hasConversation ? messages : []).map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isStreaming && (
              <div className="mb-6 ml-11 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Hokmá pensando
                <span className="typing-dots inline-flex"><span /><span /><span /></span>
              </div>
            )}
          </div>
        </div>

        <ChatInput input={input} setInput={setInput} onSend={sendMessage} isStreaming={isStreaming} />
      </main>
    </div>
  );
}

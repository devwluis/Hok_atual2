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
import { Archive, Bot, Braces, Cpu, FileText, Menu, Moon, Network, PanelLeft, Plus, Radio, ShieldCheck, Sparkles, Sun, Terminal, UploadCloud, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function DnaLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="dna-orbit" />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">OpenClaw</p>
        <h1 className="text-lg font-bold tracking-tight">HokClaw AI Agent</h1>
      </div>
    </div>
  );
}

function SidebarContent({ onNewChat }: { onNewChat: () => void }) {
  const items = [
    { icon: Bot, title: "Chat principal", text: "HokClaw como cerebro" },
    { icon: FileText, title: "Leitura de arquivos", text: "txt, codigo, json, csv" },
    { icon: Archive, title: "Pacotes e zip", text: "referencia para backend" },
    { icon: Network, title: "Automacao", text: "Termux, PC e mobile" },
  ];

  return (
    <div className="flex h-full flex-col gap-5">
      <DnaLogo />
      <Button onClick={onNewChat} className="h-11 justify-start gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <Plus className="h-4 w-4" />
        Novo chat
      </Button>
      <Link href="/dashboard">
        <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-2xl">
          <Terminal className="h-4 w-4" />
          Dashboard Hok
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
        <p className="mt-2 text-sm leading-5 text-muted-foreground">Use HokClaw local, ngrok ou OpenClaw como roteador para modelos OpenAI, Anthropic, Gemini, Qwen e Groq.</p>
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
        : "HokClaw";

  const quickCommands = [
    { icon: UploadCloud, label: "Ler arquivo", cmd: "Explique como voce vai interpretar arquivos anexados e quais formatos consegue usar agora." },
    { icon: Braces, label: "Criar codigo", cmd: "Atue como Coder e crie um plano tecnico para evoluir o HokClaw com leitura de arquivos e imagens." },
    { icon: Zap, label: "Automacao segura", cmd: "Desenhe um fluxo seguro para controlar celular e PC usando HokClaw, com permissoes claras." },
  ];

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(260_90%_60%/0.12),transparent_28%)]" />

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
                  <SheetTitle>Menu HokClaw</SheetTitle>
                  <SheetDescription>Navegacao e modulos do HokClaw</SheetDescription>
                </SheetHeader>
                <SidebarContent onNewChat={clearChat} />
              </SheetContent>
            </Sheet>
            <AgentSwitcher activeAgent={activeAgent} setActiveAgent={setActiveAgent} />
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
              <section className="flex min-h-full flex-col justify-end gap-5 pb-4 pt-6">
                <div className="glass-panel relative overflow-hidden rounded-[2rem] border border-primary/20 p-5 shadow-[0_24px_90px_rgba(8,145,178,0.16)]">
                  <div className="absolute right-[-60px] top-[-70px] h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <DnaLogo />
                      <div className="hidden rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.24em] text-primary sm:block">
                        Mobile first
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary/80">HokClaw Command Stream</p>
                      <h2 className="text-3xl font-semibold tracking-[-0.07em] sm:text-4xl">
                        Chat agentico para arquivos, modelos e automacao real.
                      </h2>
                      <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                        Use seu HokClaw local como cerebro, alterne agentes especializados, escolha modelos e envie arquivos de desenvolvimento ou imagens como contexto.
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
                HokClaw pensando
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

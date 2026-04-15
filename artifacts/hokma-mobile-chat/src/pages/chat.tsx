import React, { useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { AgentSwitcher } from "@/components/agent-switcher";
import { SettingsDrawer } from "@/components/settings-drawer";
import { Zap, Terminal, Globe, ShieldCheck, Cpu, Sparkles, Smartphone, Radio } from "lucide-react";

export default function ChatPage() {
  const { 
    messages, 
    input, 
    setInput, 
    isStreaming, 
    sendMessage, 
    activeAgent, 
    setActiveAgent,
    clearChat
  } = useChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const quickCommands = [
    { icon: Terminal, label: "Diagnosticar sistema", cmd: "Faça um diagnostico do meu ambiente e liste proximos passos" },
    { icon: Zap, label: "Criar automacao", cmd: "Crie um fluxo para controlar tarefas do PC com permissao segura" },
    { icon: Globe, label: "Modo celular", cmd: "Planeje como o Hokma deve funcionar no celular com voz e comandos" },
  ];

  const hasConversation = messages.some((message) => message.role === "user");
  const visibleMessages = hasConversation ? messages : [];

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden font-sans">
      
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl z-20 shrink-0">
        <AgentSwitcher activeAgent={activeAgent} setActiveAgent={setActiveAgent} />
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Secure</span>
          </div>
          <SettingsDrawer onClearChat={clearChat} />
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto flex flex-col min-h-full pb-6">
          {!hasConversation && (
            <section className="flex min-h-full flex-col justify-end gap-5 pt-8 pb-2">
              <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.35),transparent_42%),linear-gradient(145deg,rgba(15,23,42,0.95),rgba(2,6,23,0.96))] p-5 shadow-[0_0_45px_rgba(14,165,233,0.16)]">
                <div className="absolute right-[-40px] top-[-40px] h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_24px_rgba(14,165,233,0.26)]">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-emerald-300">Previa ativa</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-mono uppercase tracking-[0.28em] text-primary/80">Hokma Mobile Lab</p>
                    <h1 className="text-3xl font-semibold tracking-[-0.08em] text-foreground">
                      Seu Jarvis em modo teste, pronto para evoluir.
                    </h1>
                    <p className="max-w-md text-sm leading-6 text-muted-foreground">
                      Converse com agentes, simule comandos para PC ou celular, teste fluxos de voz e refine a experiencia antes de conectar o motor real.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: ShieldCheck, label: "Seguro" },
                      { icon: Cpu, label: "Agentes" },
                      { icon: Smartphone, label: "Mobile" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
                          <Icon className="mx-auto mb-2 h-4 w-4 text-primary" />
                          <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {quickCommands.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => sendMessage(cmd.cmd)}
                      className="group flex items-center gap-3 rounded-2xl border border-border bg-secondary/50 p-3 text-left text-sm text-foreground transition-all hover:border-primary/50 hover:bg-secondary active:scale-[0.98]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-medium">{cmd.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Toque para simular uma resposta do agente</span>
                      </span>
                      <Radio className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {visibleMessages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {hasConversation && (
            <div className="mt-8 flex flex-wrap gap-2">
              {quickCommands.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={i}
                    onClick={() => sendMessage(cmd.cmd)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-sm text-foreground active:scale-95"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span>{cmd.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-safe">
        <ChatInput 
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          isStreaming={isStreaming}
        />
      </div>

    </div>
  );
}
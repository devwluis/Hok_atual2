import React, { useEffect, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Server, Key, Wifi, FlaskConical, Dna, Route, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { ConnectionStatus, EngineConfig, HokConfig } from "@/hooks/use-chat";
import { MODEL_OPTIONS } from "@/hooks/use-chat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsDrawerProps {
  onClearChat: () => void;
  engineConfig: EngineConfig;
  setEngineConfig: (config: EngineConfig) => void;
  connectionStatus: ConnectionStatus;
  connectionError: string;
  testConnection: (config?: EngineConfig) => Promise<boolean>;
  hokConfig: HokConfig;
  setHokConfig: (config: HokConfig) => void;
  hokTunnelStatus: ConnectionStatus;
  openrouterStatus: ConnectionStatus;
  testHokTunnel: (config: HokConfig) => Promise<boolean>;
  validateOpenrouterKey: (config: HokConfig) => void;
}

const PHONE_IP_ENDPOINT = "http://10.168.212.48:18800/v1/chat/completions";

function StatusDot({ status }: { status: ConnectionStatus }) {
  if (status === "online") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "offline") return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === "testing") return <Loader2 className="h-4 w-4 animate-spin text-amber-400" />;
  return <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />;
}

function statusLabel(status: ConnectionStatus) {
  return { idle: "Aguardando", online: "Conectado", offline: "Falhou", testing: "Testando..." }[status];
}

export function SettingsDrawer({
  onClearChat,
  engineConfig,
  setEngineConfig,
  connectionStatus,
  connectionError,
  testConnection,
  hokConfig,
  setHokConfig,
  hokTunnelStatus,
  openrouterStatus,
  testHokTunnel,
  validateOpenrouterKey,
}: SettingsDrawerProps) {
  const [draft, setDraft] = useState(engineConfig);
  const [hokDraft, setHokDraft] = useState(hokConfig);
  const [showToken, setShowToken] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"engine" | "hok">("hok");

  useEffect(() => { setDraft(engineConfig); }, [engineConfig]);
  useEffect(() => { setHokDraft(hokConfig); }, [hokConfig]);

  const applyConfig = () => { setEngineConfig(draft); };
  const applyHokConfig = () => {
    setHokConfig(hokDraft);
    validateOpenrouterKey(hokDraft);
  };

  const statusClass = connectionStatus === "online"
    ? "bg-emerald-500"
    : connectionStatus === "offline"
      ? "bg-red-500"
      : connectionStatus === "testing"
        ? "bg-amber-400 animate-pulse"
        : "bg-muted-foreground/50";

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border bg-card/70 text-muted-foreground shadow-sm hover:text-foreground">
          <Settings className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card max-h-[90dvh]">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-2">
              <Dna className="h-5 w-5 text-primary" />
              Configuracao HokClaw
            </DrawerTitle>
            <DrawerDescription>Conecte ao HOK Orquestrador, OpenRouter Visao ou ao servidor local.</DrawerDescription>
          </DrawerHeader>

          {/* Tab switcher */}
          <div className="mx-4 mb-1 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/30 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("hok")}
              className={`rounded-xl py-2 text-xs font-medium transition-all ${activeTab === "hok" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}
            >
              HOK Orquestrador
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("engine")}
              className={`rounded-xl py-2 text-xs font-medium transition-all ${activeTab === "engine" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}
            >
              Motor Local
            </button>
          </div>

          <div className="overflow-y-auto max-h-[55dvh]">
            {/* HOK ORQUESTRADOR TAB */}
            {activeTab === "hok" && (
              <div className="space-y-4 p-4 pb-2">

                {/* Status cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/35 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium">HOK Tunnel</p>
                      <p className="text-[11px] text-muted-foreground">{statusLabel(hokTunnelStatus)}</p>
                    </div>
                    <StatusDot status={hokTunnelStatus} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/35 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium">OpenRouter</p>
                      <p className="text-[11px] text-muted-foreground">{statusLabel(openrouterStatus)}</p>
                    </div>
                    <StatusDot status={openrouterStatus} />
                  </div>
                </div>

                {/* Roteamento info */}
                <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="text-xs leading-5 text-muted-foreground">
                    <span className="font-medium text-foreground">Roteamento automatico:</span>
                    {" "}Texto → HOK Tunnel (DeepSeek). Imagem → OpenRouter (GPT-4o-mini).
                  </div>
                </div>

                {/* URL do tunel */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">URL Tunel HOK</label>
                  <input
                    value={hokDraft.hokUrl}
                    onChange={(e) => setHokDraft((c) => ({ ...c, hokUrl: e.target.value }))}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    placeholder="http://bore.pub:35798/hok"
                  />
                </div>

                {/* Token HOK */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Token HOK</label>
                  <div className="relative">
                    <input
                      value={hokDraft.hokToken}
                      onChange={(e) => setHokDraft((c) => ({ ...c, hokToken: e.target.value }))}
                      type={showToken ? "text" : "password"}
                      className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground outline-none focus:border-primary"
                      placeholder="X-HOK-TOKEN"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* OpenRouter API Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Key className="h-3.5 w-3.5" />
                    OpenRouter API Key (para visao de imagens)
                  </div>
                  <div className="relative">
                    <input
                      value={hokDraft.openrouterKey}
                      onChange={(e) => setHokDraft((c) => ({ ...c, openrouterKey: e.target.value }))}
                      type={showKey ? "text" : "password"}
                      className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground outline-none focus:border-primary"
                      placeholder="sk-or-v1-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Cole sua chave em openrouter.ai — nao e salva no servidor, apenas no navegador.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="rounded-full text-xs" onClick={applyHokConfig}>Salvar</Button>
                  <Button
                    type="button"
                    className="gap-2 rounded-full text-xs"
                    onClick={async () => { applyHokConfig(); await testHokTunnel(hokDraft); }}
                    disabled={hokTunnelStatus === "testing"}
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    Testar HOK
                  </Button>
                </div>
              </div>
            )}

            {/* MOTOR LOCAL TAB */}
            {activeTab === "engine" && (
              <div className="space-y-4 p-4 pb-2">
                <h4 className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Modo de conexao</h4>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft((c) => ({ ...c, mode: "hokclaw" }))}
                    className={`rounded-2xl border p-3 text-left transition-all ${draft.mode === "hokclaw" ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(14,165,233,0.14)]" : "border-border bg-secondary/40"}`}
                  >
                    <Server className="mb-2 h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">HokClaw Local</p>
                    <p className="text-xs text-muted-foreground">Termux ou PC</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((c) => ({ ...c, mode: "preview" }))}
                    className={`rounded-2xl border p-3 text-left transition-all ${draft.mode === "preview" ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(14,165,233,0.14)]" : "border-border bg-secondary/40"}`}
                  >
                    <FlaskConical className="mb-2 h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Previa</p>
                    <p className="text-xs text-muted-foreground">Simulado</p>
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/35 p-3">
                  <div>
                    <p className="text-sm font-medium">Servidor do celular</p>
                    <p className="text-xs text-muted-foreground">{statusLabel(connectionStatus)}</p>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full ${statusClass}`} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Endpoint</label>
                  <input
                    value={draft.endpoint}
                    onChange={(e) => setDraft((c) => ({ ...c, endpoint: e.target.value }))}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    placeholder={PHONE_IP_ENDPOINT}
                  />
                  <Button type="button" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={() => setDraft((c) => ({ ...c, endpoint: PHONE_IP_ENDPOINT }))}>
                    Usar IP do celular
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Modelo</label>
                  <Select value={draft.model} onValueChange={(model) => setDraft((c) => ({ ...c, model }))}>
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

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Key className="h-4 w-4" />
                    Chave opcional, apenas se seu servidor exigir
                  </div>
                  <input
                    value={draft.apiKey}
                    onChange={(e) => setDraft((c) => ({ ...c, apiKey: e.target.value }))}
                    type="password"
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    placeholder="Bearer token opcional"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="rounded-full" onClick={applyConfig}>Salvar motor</Button>
                  <Button type="button" className="gap-2 rounded-full" onClick={async () => { applyConfig(); await testConnection(draft); }}>
                    <Wifi className="h-4 w-4" />
                    Testar
                  </Button>
                </div>

                {connectionError && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-600 dark:text-red-200">
                    {connectionError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border mx-4 mt-3 pt-3 pb-1">
            <Button variant="destructive" className="w-full justify-start gap-2 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={onClearChat}>
              <Trash2 className="h-4 w-4" />
              Limpar memoria da sessao
            </Button>
          </div>

          <DrawerFooter className="pt-3">
            <DrawerClose asChild>
              <Button variant="outline" className="rounded-full">Fechar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

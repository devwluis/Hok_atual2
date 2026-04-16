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
import { Settings, Trash2, Server, Key, Wifi, FlaskConical, Dna } from "lucide-react";
import type { ConnectionStatus, EngineConfig } from "@/hooks/use-chat";
import { MODEL_OPTIONS } from "@/hooks/use-chat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsDrawerProps {
  onClearChat: () => void;
  engineConfig: EngineConfig;
  setEngineConfig: (config: EngineConfig) => void;
  connectionStatus: ConnectionStatus;
  connectionError: string;
  testConnection: (config?: EngineConfig) => Promise<boolean>;
}

const PHONE_IP_ENDPOINT = "http://10.168.212.48:18800/v1/chat/completions";

export function SettingsDrawer({
  onClearChat,
  engineConfig,
  setEngineConfig,
  connectionStatus,
  connectionError,
  testConnection,
}: SettingsDrawerProps) {
  const [draft, setDraft] = useState(engineConfig);

  useEffect(() => {
    setDraft(engineConfig);
  }, [engineConfig]);

  const applyConfig = () => {
    setEngineConfig(draft);
  };

  const statusLabel = {
    idle: "Aguardando teste",
    online: "Conectado",
    offline: "Sem conexao",
    testing: "Testando",
  }[connectionStatus];

  const statusClass = connectionStatus === "online"
    ? "bg-emerald-500"
    : connectionStatus === "offline"
      ? "bg-red-500"
      : connectionStatus === "testing"
        ? "bg-amber-400"
        : "bg-muted-foreground";

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border bg-card/70 text-muted-foreground shadow-sm hover:text-foreground">
          <Settings className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-2">
              <Dna className="h-5 w-5 text-primary" />
              Configuracao HokClaw
            </DrawerTitle>
            <DrawerDescription>Conecte o chat ao servidor do celular, escolha modelos ou use a previa.</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 p-4 pb-0">
            <div className="space-y-4">
              <h4 className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">Motor</h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, mode: "hokclaw" }))}
                  className={`rounded-2xl border p-3 text-left transition-all ${draft.mode === "hokclaw" ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(14,165,233,0.14)]" : "border-border bg-secondary/40"}`}
                >
                  <Server className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">HokClaw Local</p>
                  <p className="text-xs text-muted-foreground">Termux ou PC</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, mode: "preview" }))}
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
                  <p className="text-xs text-muted-foreground">{statusLabel}</p>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${statusClass}`} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Endpoint</label>
                <input
                  value={draft.endpoint}
                  onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))}
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  placeholder={PHONE_IP_ENDPOINT}
                />
                <Button type="button" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={() => setDraft((current) => ({ ...current, endpoint: PHONE_IP_ENDPOINT }))}>
                  Usar IP do celular
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Modelo</label>
                <Select value={draft.model} onValueChange={(model) => setDraft((current) => ({ ...current, model }))}>
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

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Key className="h-4 w-4" />
                  Chave opcional, apenas se seu servidor exigir
                </div>
                <input
                  value={draft.apiKey}
                  onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
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

            <div className="border-t border-border pt-4">
              <Button variant="destructive" className="w-full justify-start gap-2 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={onClearChat}>
                <Trash2 className="h-4 w-4" />
                Limpar memoria da sessao
              </Button>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="rounded-full">Fechar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

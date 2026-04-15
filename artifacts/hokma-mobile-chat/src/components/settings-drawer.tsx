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
import { Settings, Trash2, Server, Key, Mic, Shield, Wifi, FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { ConnectionStatus, EngineConfig } from "@/hooks/use-chat";

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
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-card border-border">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Configuracao Hokma</DrawerTitle>
            <DrawerDescription>Conecte o chat ao servidor HokClaw do Termux ou use modo previa.</DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 pb-0 space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Motor</h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, mode: "hokclaw" }))}
                  className={`rounded-2xl border p-3 text-left transition-all ${draft.mode === "hokclaw" ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
                >
                  <Server className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">HokClaw Local</p>
                  <p className="text-xs text-muted-foreground">Termux ou PC</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, mode: "preview" }))}
                  className={`rounded-2xl border p-3 text-left transition-all ${draft.mode === "preview" ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
                >
                  <FlaskConical className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Previa</p>
                  <p className="text-xs text-muted-foreground">Simulado</p>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Server className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Servidor do celular</p>
                    <p className="text-xs text-muted-foreground">{statusLabel}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${statusClass}`}></div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Endpoint
                </label>
                <input
                  value={draft.endpoint}
                  onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  placeholder={PHONE_IP_ENDPOINT}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setDraft((current) => ({ ...current, endpoint: PHONE_IP_ENDPOINT }))}
                >
                  Usar IP do celular
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Modelo
                </label>
                <input
                  value={draft.model}
                  onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="llama-3.1-8b-instant"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Key className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Chave opcional</p>
                    <p className="text-xs text-muted-foreground">Use apenas se seu servidor exigir</p>
                  </div>
                </div>
              </div>

              <input
                value={draft.apiKey}
                onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
                type="password"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Bearer token opcional"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={applyConfig}>
                  Salvar motor
                </Button>
                <Button type="button" className="rounded-full gap-2" onClick={async () => {
                  applyConfig();
                  await testConnection(draft);
                }}>
                  <Wifi className="h-4 w-4" />
                  Testar
                </Button>
              </div>

              {connectionError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
                  {connectionError}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Preferencias</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Escuta continua</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Modo local primeiro</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="destructive" 
                className="w-full justify-start gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent hover:border-destructive/30"
                onClick={onClearChat}
              >
                <Trash2 className="w-4 h-4" />
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
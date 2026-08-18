"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Bug,
  Send,
  Copy,
  Webhook,
  ChevronDown,
  ChevronUp,
  Workflow,
  X,
  Image as ImageIcon,
  Paperclip,
  Mic,
  FileAudio,
  Plus,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { ElectricCore } from "@/components/chat/ElectricCore";
import { NuclearCore } from "@/components/chat/NuclearCore";
import { cn } from "@/lib/utils";
import { conversationsStore, type ChatMessage } from "@/lib/conversations-store";
import { useAppState } from "@/hooks/use-app-state";
import { getModel } from "@/lib/hok-models";
import { detectN8NIntent, N8N_SYSTEM_PROMPT, type N8NModeState } from "@/lib/n8n-expert";
import { FALLBACK_MODELS, fetchModelCatalog, type ChatModel } from "@/lib/model-registry";

// Unified settings key
const SETTINGS_KEY = "hokma.settings.v1";
const N8N_SETTINGS_KEY = "hokma.n8n.settings.v1";

type Msg = ChatMessage & {
  meta?: { ms: number; model?: string };
};

type Attachment = {
  id: string;
  type: "image" | "file" | "audio";
  name: string;
  size: number;
  dataUrl?: string;   // para preview de imagem
  textContent?: string; // conteúdo de texto (arquivos de código/texto)
};

type ComposerMode = "automatic" | "plan" | "build" | "n8n";

const MODE_OPTIONS: { id: ComposerMode; label: string; detail: string }[] = [
  { id: "automatic", label: "Automático", detail: "Detecção de intenção ativa" },
  { id: "plan", label: "Planejar", detail: "Estrutura antes da execução" },
  { id: "build", label: "Construir", detail: "Execução direta" },
  { id: "n8n", label: "N8N Expert", detail: "Workflows e automações" },
];

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { serverUrl: "", token: "", groqKey: "" };
    const s = JSON.parse(raw) as Record<string, string>;
    return {
      serverUrl: s["Server URL"] || "",
      token: s["HOK_TOKEN"] || "",
      groqKey: s["Groq"] || "",
    };
  } catch {
    return { serverUrl: "", token: "", groqKey: "" };
  }
}

function readN8NWebhook(): { webhookUrl: string; token: string } {
  try {
    const raw = localStorage.getItem(N8N_SETTINGS_KEY);
    if (!raw) return { webhookUrl: "", token: "" };
    const s = JSON.parse(raw) as Record<string, string>;
    return {
      webhookUrl: s["defaultWebhookUrl"] || s["url"] || "",
      token: s["token"] || "",
    };
  } catch {
    return { webhookUrl: "", token: "" };
  }
}

function extractJsonBlock(text: string): string | null {
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
}

// ── JSON block inside assistant bubble ────────────────────────────────────────
function JsonBlock({ json, onSendToWebhook }: { json: string; onSendToWebhook?: (j: string) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">json</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-700"
          >
            <Copy className="h-3 w-3" /> {copied ? "Copiado" : "Copy JSON"}
          </button>
          {onSendToWebhook && (
            <button
              onClick={() => onSendToWebhook(json)}
              className="inline-flex items-center gap-1 rounded-md bg-[color:var(--amber)]/90 px-2 py-1 text-[10px] font-semibold text-[color:var(--amber-foreground)] hover:opacity-90"
            >
              <Webhook className="h-3 w-3" /> Webhook
            </button>
          )}
        </div>
      </div>
      <pre className="thin-scroll max-h-72 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed text-emerald-300">
        {json}
      </pre>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, onSendToWebhook }: { msg: Msg; onSendToWebhook?: (j: string) => void }) {
  const isUser = msg.role === "user";
  const jsonBlock = !isUser ? extractJsonBlock(msg.text) : null;
  const bodyText = jsonBlock ? msg.text.replace(/```json[\s\S]*?```/i, "").trim() : msg.text;
  const modelInfo = !isUser && msg.meta?.model ? getModel(msg.meta.model) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[85%] px-4 py-3 text-sm shadow-sm",
          isUser
            ? "rounded-[20px] rounded-br-md bg-[color:var(--amber)] text-[color:var(--amber-foreground)]"
            : "rounded-[20px] rounded-bl-md border border-border bg-card text-card-foreground",
        )}
      >
        {bodyText && <div className="whitespace-pre-wrap leading-relaxed">{bodyText}</div>}
        {jsonBlock && <JsonBlock json={jsonBlock} onSendToWebhook={onSendToWebhook} />}

        {!isUser && msg.meta && (
          <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-1.5">
            {modelInfo && (
              <span className="flex items-center gap-1 text-[10px] font-mono font-medium" style={{ color: modelInfo.color }}>
                {modelInfo.label}
              </span>
            )}
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {(msg.meta.ms / 1000).toFixed(1)}s
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Model picker ──────────────────────────────────────────────────────────────
const PROVIDER_LABELS: Record<string, string> = {
  "OpenCode Zen": "OpenCode (Zen)",
  Openrouter: "OpenRouter",
  OpenRouter: "OpenRouter",
  Google: "Google",
};

function ModelPicker({
  selected,
  models,
  loading,
  error,
  onSelect,
  onRetry,
  onClose,
}: {
  selected: string;
  models: ChatModel[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? models.filter((m) => m.label.toLowerCase().includes(query.trim().toLowerCase()))
    : models;
  const providers = filtered.reduce<Record<string, ChatModel[]>>((groups, model) => {
    const provider = model.provider || "Outro";
    (groups[provider] ||= []).push(model);
    return groups;
  }, {});

  return (
    <div className="thin-scroll max-h-[min(320px,50dvh)] overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-[0_16px_34px_rgb(0_0_0/0.45)]">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Catálogo de IA</span>
        <div className="flex items-center gap-1.5">
          {loading && <span className="font-mono text-[9px] text-[color:var(--amber)]">sincronizando</span>}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[color:var(--amber)]/10 hover:text-[color:var(--amber)]"
            aria-label="Fechar catálogo"
            data-testid="button-model-picker-close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mb-1 px-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar modelo por nome..."
          className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none placeholder:text-muted-foreground focus:border-[color:var(--amber)]"
          data-testid="input-model-search"
        />
      </div>
      {error && (
        <div className="mb-1 rounded-xl border border-red-500/20 bg-red-500/5 px-2.5 py-2 text-[10px] text-red-300">
          <div>{error}</div>
          <button type="button" onClick={onRetry} className="mt-1 font-semibold text-[color:var(--amber)] hover:underline">
            Tentar novamente
          </button>
        </div>
      )}
      {loading && (
        <div className="space-y-1 px-1 pb-1" aria-label="Carregando modelos">
          <div className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
          <div className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">Nenhum modelo para "{query}"</div>
      )}
      {!loading && Object.entries(providers).map(([provider, providerModels]) => (
        <div key={provider} className="mt-1">
          <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
            {PROVIDER_LABELS[provider] ?? provider}
          </div>
          <div className="space-y-0.5">
            {providerModels.map((model) => (
              <button
                type="button"
                key={model.id}
                onClick={() => onSelect(model.id)}
                title={model.description}
                className={cn(
                  "flex w-full items-center justify-between gap-1.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[color:var(--amber)]/10",
                  selected === model.id ? "bg-[color:var(--amber)]/10 text-[color:var(--amber)]" : "text-foreground",
                )}
              >
                <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="truncate text-[12px] font-semibold">{model.label}</span>
                  <span className="shrink-0 font-mono text-[9px] text-muted-foreground/70">— {PROVIDER_LABELS[model.provider] ?? model.provider}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                    model.free === false
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/15 text-emerald-500",
                  )}
                >
                  {model.free === false ? "Pago" : "Free"}
                </span>
                {selected === model.id && <Check className="ml-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function ChatScreen() {
  const { conversationId, setConversationId } = useAppState();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelCatalog, setModelCatalog] = useState<ChatModel[]>(FALLBACK_MODELS);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<ComposerMode>("automatic");
  const [showModePicker, setShowModePicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSecondaryMenu, setShowSecondaryMenu] = useState(false);
  const [n8nMode, setN8nMode] = useState<N8NModeState>("off");
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const n8nActive = n8nMode !== "off";

  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef<string>("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const loadModels = async (force = false) => {
    setModelLoading(true);
    setModelError(null);
    try {
      const remoteModels = await fetchModelCatalog(force);
      setModelCatalog([
        FALLBACK_MODELS[0],
        ...remoteModels.filter((model) => model.id !== "auto"),
      ]);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : "Não foi possível carregar o catálogo");
      setModelCatalog(FALLBACK_MODELS);
    } finally {
      setModelLoading(false);
    }
  };

  useEffect(() => {
    if (!showModelPicker) return;
    void loadModels();
  }, [showModelPicker]);

  const handleModeSelect = (mode: ComposerMode) => {
    setComposerMode(mode);
    setShowModePicker(false);
    setN8nMode(mode === "n8n" ? "manual" : "off");
  };

  // ── Lê arquivo e adiciona ao estado ──
  const addFile = (file: File, kind: Attachment["type"]) => {
    const id = crypto.randomUUID();
    const base: Attachment = { id, type: kind, name: file.name, size: file.size };
    const reader = new FileReader();
    if (kind === "image") {
      reader.onload = () => setAttachments((a) => [...a, { ...base, dataUrl: reader.result as string }]);
      reader.readAsDataURL(file);
    } else if (kind === "file" && file.size < 200_000 && /\.(txt|md|json|ts|tsx|js|jsx|py|sh|yaml|yml|env|csv|html|css|xml|toml|sql)$/i.test(file.name)) {
      reader.onload = () => setAttachments((a) => [...a, { ...base, textContent: reader.result as string }]);
      reader.readAsText(file);
    } else {
      setAttachments((a) => [...a, base]);
    }
  };

  const handlePhotoChange  = (e: ChangeEvent<HTMLInputElement>) => { [...(e.target.files ?? [])].forEach((f) => addFile(f, "image")); e.target.value = ""; };
  const handleFileChange   = (e: ChangeEvent<HTMLInputElement>) => { [...(e.target.files ?? [])].forEach((f) => addFile(f, "file"));  e.target.value = ""; };
  const handleAudioChange  = (e: ChangeEvent<HTMLInputElement>) => { [...(e.target.files ?? [])].forEach((f) => addFile(f, "audio")); e.target.value = ""; };

  const removeAttachment = (id: string) => setAttachments((a) => a.filter((x) => x.id !== id));

  // Formata anexos como contexto de texto para o prompt
  const buildAttachmentContext = (atts: Attachment[]): string => {
    if (!atts.length) return "";
    return atts.map((a) => {
      if (a.type === "image") return `[Imagem anexada: ${a.name}]`;
      if (a.type === "audio") return `[Áudio anexado: ${a.name}]`;
      if (a.textContent) return `[Arquivo: ${a.name}]\n\`\`\`\n${a.textContent.slice(0, 8000)}\n\`\`\``;
      return `[Arquivo anexado: ${a.name} (${(a.size / 1024).toFixed(1)} KB)]`;
    }).join("\n\n");
  };

  const activeModel = modelCatalog.find((model) => model.id === selectedModel) ?? getModel(selectedModel);
  const activeMode = MODE_OPTIONS.find((mode) => mode.id === composerMode) ?? MODE_OPTIONS[0];

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    const conv = conversationsStore.get(conversationId);
    setMessages(conv ? (conv.messages as Msg[]) : []);
  }, [conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  const persist = (next: Msg[], idOverride?: string) => {
    const id = idOverride ?? conversationId;
    if (!id) return;
    const stripped: ChatMessage[] = next.map(({ id: mid, role, text }) => ({ id: mid, role, text }));
    const existing = conversationsStore.get(id);
    const title = existing?.title && existing.title !== "Nova conversa"
      ? existing.title
      : (stripped.find((m) => m.role === "user")?.text.slice(0, 40) ?? "Nova conversa");
    conversationsStore.upsert({ id, title, updatedAt: Date.now(), messages: stripped });
  };

  const handleSendToWebhook = async (json: string) => {
    const { webhookUrl, token } = readN8NWebhook();
    if (!webhookUrl) {
      setWebhookResult("Configure o Webhook URL nas configurações do N8N primeiro.");
      setTimeout(() => setWebhookResult(null), 3000);
      return;
    }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["X-N8N-API-KEY"] = token;
      const res = await fetch(webhookUrl, { method: "POST", headers, body: json });
      setWebhookResult(res.ok ? `Enviado (${res.status})` : `Erro ${res.status}`);
    } catch {
      setWebhookResult("Falha ao enviar para o webhook.");
    }
    setTimeout(() => setWebhookResult(null), 3000);
  };

  const send = async () => {
    const t = input.trim();
    if ((!t && attachments.length === 0) || loading) return;

    setError(null);
    let id = conversationId;
    if (!id) {
      const c = conversationsStore.create((t || attachments[0]?.name || "Anexo").slice(0, 40));
      id = c.id;
      setConversationId(id);
    }

    // Constrói texto completo com contexto de anexos
    const attCtx = buildAttachmentContext(attachments);
    const fullText = [attCtx, t].filter(Boolean).join("\n\n");

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: fullText };
    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    persist(afterUser, id);
    setInput("");
    setAttachments([]);
    setLoading(true);
    accRef.current = "";

    // ── N8N intent auto-detection ──
    if (n8nMode === "off" && detectN8NIntent(t)) {
      setN8nMode("auto");
    }
    const isN8N = n8nMode !== "off" || detectN8NIntent(t);

    const { serverUrl, token, groqKey } = readSettings();

    if (serverUrl && !token) {
      setError("Configure o HOK_TOKEN nas Configurações para usar o servidor externo.");
      setLoading(false);
      return;
    }

    const baseUrl = serverUrl || window.location.origin;
    const endpointPath = serverUrl ? "/chat/smart" : "/api/chat";
    const assistantId = crypto.randomUUID();
    const startedAt = performance.now();

    abortRef.current = new AbortController();

    // System prompt padrão — garante resposta em PT-BR sem reticências
    const DEFAULT_SYSTEM = `Você é H.O.K., um assistente de IA inteligente e direto, especializado em desenvolvimento de software e automação. Responda sempre em português do Brasil, de forma clara, objetiva e útil. Nunca responda apenas com "..." ou reticências — sempre forneça uma resposta real e completa, mesmo para saudações simples.`;
    const modeInstruction = composerMode === "plan"
      ? "Modo Planejar: primeiro apresente a análise, os passos e os riscos. Não execute mudanças antes de explicar o plano."
      : composerMode === "build"
        ? "Modo Construir: seja direto e priorize a implementação, validando o resultado ao final."
        : "";

    // Build messages — N8N mode sobrepõe o prompt padrão
    const outMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
      { role: "system" as const, content: isN8N ? N8N_SYSTEM_PROMPT : [DEFAULT_SYSTEM, modeInstruction].filter(Boolean).join("\n\n") },
      ...afterUser.map((m) => ({ role: m.role as "user" | "assistant", content: m.text })),
    ];

    try {
      const { streamChat } = await import("@/lib/chat-stream");
      await streamChat({
        baseUrl,
        endpointPath,
        token,
        groqKey,
        webSearch,
        selectedModel,
        messages: outMessages,
        signal: abortRef.current.signal,
        onToken: (delta) => {
          accRef.current += delta;
          const text = accRef.current;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === assistantId);
            return exists
              ? prev.map((m) => (m.id === assistantId ? { ...m, text } : m))
              : [...prev, { id: assistantId, role: "assistant" as const, text }];
          });
        },
      });

      const ms = performance.now() - startedAt;
      const final: Msg = {
        id: assistantId,
        role: "assistant",
        text: accRef.current || "Resposta vazia.",
        meta: { ms, model: selectedModel },
      };
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === assistantId);
        return exists ? prev.map((m) => (m.id === assistantId ? final : m)) : [...prev, final];
      });
      persist([...afterUser, final], id);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // intentional stop
      } else {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        if (!accRef.current) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const { serverUrl } = readSettings();

  return (
    <div className="hok-console hok-noise flex h-full flex-col bg-background">
      {/* ── Messages ── */}
      <div className="thin-scroll flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center">
            <NuclearCore />
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onSendToWebhook={handleSendToWebhook} />
          ))}

          {/* Thinking animation with electric core */}
          {loading && accRef.current === "" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="rounded-[20px] rounded-bl-md border border-border bg-card px-4">
                <ElectricCore
                   label="Processando requisição"
                  modelName={activeModel.id !== "auto" ? activeModel.label : undefined}
                />
              </div>
            </motion.div>
          )}
        </div>
        <div ref={endRef} />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <span className="flex-1">{error}</span>
           <button onClick={() => setError(null)} className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100" aria-label="Fechar erro">
             <X className="h-3.5 w-3.5" />
           </button>
        </div>
      )}

      {/* ── Webhook result ── */}
      {webhookResult && (
        <div className="mx-4 mb-2 rounded-xl border border-[color:var(--amber)]/30 bg-[color:var(--amber)]/10 px-4 py-2 text-sm text-[color:var(--amber)]">
          {webhookResult}
        </div>
      )}

      {/* ── N8N Expert Mode banner ── */}
      <AnimatePresence>
        {n8nActive && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mx-4 mb-2 flex items-center gap-2 rounded-xl border px-3 py-2"
            style={{
              borderColor: "rgba(225,29,72,0.35)",
              background: "rgba(225,29,72,0.07)",
            }}
          >
            <Workflow className="h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span className="flex-1 text-[11px] font-medium text-rose-500">
              Modo N8N Expert ativo
              {n8nMode === "auto" && (
                <span className="ml-1 text-rose-400/70 font-normal">· detectado automaticamente</span>
              )}
            </span>
            <button
              onClick={() => { setN8nMode("off"); setComposerMode("automatic"); }}
              className="rounded-md p-0.5 text-rose-400/60 hover:text-rose-400 transition-colors"
              title="Desativar modo N8N"
              aria-label="Desativar modo N8N"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── No settings info ── */}
      {messages.length === 0 && !loading && !serverUrl && (
        <div className="mx-4 mb-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          Operando via IA interna (Groq). Configure <strong>Server URL</strong> + <strong>HOK_TOKEN</strong> nas Configurações para conectar ao servidor HOK.
        </div>
      )}

      {/* ── Hidden file inputs ── */}
      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
      <input ref={fileInputRef}  type="file" multiple className="hidden" onChange={handleFileChange} />
      <input ref={audioInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleAudioChange} />

      {/* ── Input area ── */}
      <div className="hok-composer relative border-t border-border bg-background/90 px-4 pb-[calc(env(safe-area-inset-bottom)+80px)] pt-3 backdrop-blur-xl">

        {/* The two command selectors stay above the text field on purpose. */}
        <div className="mb-2 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => { setShowModelPicker((value) => !value); setShowModePicker(false); }}
              className="hok-console-button flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-secondary px-2.5 py-2 text-left hover:border-[color:var(--amber)]/60"
              aria-expanded={showModelPicker}
              aria-controls="model-menu"
              data-testid="button-model-selector"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">⚡ IA</span>
                <span className="truncate text-[12px] font-semibold" style={{ color: activeModel.color }}>{activeModel.label}</span>
              </span>
              {showModelPicker ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showModelPicker && (
                <motion.div
                  id="model-menu"
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  className="absolute bottom-[calc(100%+8px)] left-0 z-40 w-[min(340px,calc(100vw-20px))]"
                >
                  <ModelPicker
                    selected={selectedModel}
                    models={modelCatalog}
                    loading={modelLoading}
                    error={modelError}
                    onRetry={() => void loadModels(true)}
                    onClose={() => setShowModelPicker(false)}
                    onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {showModelPicker && (
              <div className="fixed inset-0 z-30" onClick={() => setShowModelPicker(false)} aria-hidden="true" />
            )}
          </div>

          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => { setShowModePicker((value) => !value); setShowModelPicker(false); }}
              className={cn(
                "hok-console-button flex w-full items-center justify-between gap-2 rounded-xl border bg-secondary px-2.5 py-2 text-left hover:border-[color:var(--amber)]/60",
                n8nActive ? "border-rose-500/40" : "border-border",
              )}
              aria-expanded={showModePicker}
              aria-controls="mode-menu"
              data-testid="button-mode-selector"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">◈ MODO</span>
                <span className={cn("truncate text-[12px] font-semibold", n8nActive ? "text-rose-300" : "text-[color:var(--amber)]")}>{activeMode.label}</span>
              </span>
              {showModePicker ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showModePicker && (
                <motion.div
                  id="mode-menu"
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  className="absolute bottom-[calc(100%+8px)] right-0 z-40 w-[min(250px,calc(100vw-20px))] rounded-2xl border border-border bg-popover p-1.5 shadow-[0_16px_34px_rgb(0_0_0/0.45)]"
                >
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Modo de operação</span>
                    <button
                      type="button"
                      onClick={() => setShowModePicker(false)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[color:var(--amber)]/10 hover:text-[color:var(--amber)]"
                      aria-label="Fechar seletor de modo"
                      data-testid="button-mode-picker-close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {MODE_OPTIONS.map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[color:var(--amber)]/10",
                        composerMode === mode.id ? "bg-[color:var(--amber)]/10 text-[color:var(--amber)]" : "text-foreground",
                      )}
                      data-testid={`button-mode-${mode.id}`}
                    >
                      <span>
                        <span className="block text-[12px] font-semibold">{mode.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{mode.detail}</span>
                      </span>
                      {composerMode === mode.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {showModePicker && (
              <div className="fixed inset-0 z-30" onClick={() => setShowModePicker(false)} aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Attachment preview strip */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-2 flex gap-2 overflow-x-auto pb-1 thin-scroll"
            >
              {attachments.map((att) => (
                <motion.div
                  key={att.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative shrink-0 flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5"
                >
                  {/* Thumbnail para imagem */}
                  {att.type === "image" && att.dataUrl ? (
                    <img src={att.dataUrl} alt={att.name} className="h-8 w-8 rounded-lg object-cover" />
                  ) : att.type === "audio" ? (
                    <FileAudio className="h-4 w-4 shrink-0 text-[color:var(--amber)]" />
                  ) : (
                    <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="max-w-[80px] truncate text-[11px] text-muted-foreground">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea row */}
        <div className={cn("flex items-end gap-2 rounded-2xl border bg-popover px-2.5 py-2 transition-all", isTextareaFocused ? "border-[color:var(--amber)] shadow-[var(--shadow-amber-glow)]" : "border-border")}>
          {/* Attachment affordance. The menu keeps the row quiet on mobile. */}
          <div className="relative pb-0.5">
            <button
              type="button"
              onClick={() => setShowPlusMenu((value) => !value)}
              className="hok-console-button flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-[color:var(--amber)] hover:border-[color:var(--amber)]/60 hover:bg-[color:var(--amber)]/10"
              aria-label="Adicionar anexo"
              aria-expanded={showPlusMenu}
              data-testid="button-open-attachments"
            >
              <Plus className={cn("h-4 w-4 transition-transform", showPlusMenu && "rotate-45")} />
            </button>
            <AnimatePresence>
              {showPlusMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  className="absolute bottom-[calc(100%+8px)] left-0 z-40 w-[190px] rounded-2xl border border-border bg-popover p-1.5 shadow-[0_16px_34px_rgb(0_0_0/0.45)]"
                >
                  <div className="flex items-center justify-end px-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowPlusMenu(false)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[color:var(--amber)]/10 hover:text-[color:var(--amber)]"
                      aria-label="Fechar menu de anexos"
                      data-testid="button-plus-menu-close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button type="button" onClick={() => { photoInputRef.current?.click(); setShowPlusMenu(false); }} className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10px] text-muted-foreground hover:bg-[color:var(--amber)]/10 hover:text-[color:var(--amber)]" data-testid="button-attach-photo">
                      <ImageIcon className="h-4 w-4" /> Foto
                    </button>
                    <button type="button" onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10px] text-muted-foreground hover:bg-[color:var(--amber)]/10 hover:text-[color:var(--amber)]" data-testid="button-attach-file">
                      <Paperclip className="h-4 w-4" /> Arquivo
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {showPlusMenu && (
              <div className="fixed inset-0 z-30" onClick={() => setShowPlusMenu(false)} aria-hidden="true" />
            )}
          </div>

          {/* Divider */}
          <div className="mb-1 h-5 w-px shrink-0 bg-border" />

          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsTextareaFocused(true)}
            onBlur={() => setIsTextareaFocused(false)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Insira sua instrução, Sr."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{ maxHeight: 120 }}
          />
          <div className="flex items-center gap-1 pb-0.5">
            <div className="relative">
            <button
              type="button"
              onClick={() => setShowSecondaryMenu((value) => !value)}
              className={cn("flex h-8 w-8 items-center justify-center rounded-full transition-colors", showSecondaryMenu ? "bg-[color:var(--amber)]/15 text-[color:var(--amber)]" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              aria-label="Mais opções do chat"
              aria-expanded={showSecondaryMenu}
              data-testid="button-secondary-options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {showSecondaryMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  className="absolute bottom-[calc(100%+8px)] right-0 z-40 w-[176px] rounded-2xl border border-border bg-popover p-1.5 shadow-[0_16px_34px_rgb(0_0_0/0.45)]"
                >
                  <div className="flex items-center justify-end px-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowSecondaryMenu(false)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[color:var(--amber)]/10 hover:text-[color:var(--amber)]"
                      aria-label="Fechar opções"
                      data-testid="button-secondary-close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => setWebSearch((value) => !value)} className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] text-foreground hover:bg-[color:var(--amber)]/10" data-testid="button-web-search">
                    <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Busca web</span>
                    <span className={cn("h-1.5 w-1.5 rounded-full", webSearch ? "bg-emerald-400" : "bg-muted-foreground/40")} />
                  </button>
                  <button type="button" onClick={() => setDebugMode((value) => !value)} className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] text-foreground hover:bg-[color:var(--amber)]/10" data-testid="button-debug-mode">
                    <span className="flex items-center gap-2"><Bug className="h-3.5 w-3.5" /> Debug</span>
                    <span className={cn("h-1.5 w-1.5 rounded-full", debugMode ? "bg-red-400" : "bg-muted-foreground/40")} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {showSecondaryMenu && (
              <div className="fixed inset-0 z-30" onClick={() => setShowSecondaryMenu(false)} aria-hidden="true" />
            )}
            </div>

            {/* Real mic affordance remains immediately beside send/stop. */}
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-400 transition-colors hover:bg-emerald-400/10"
              aria-label="Anexar áudio pelo microfone"
              title="Anexar áudio"
              data-testid="button-microphone"
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Send / Stop */}
            {loading ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25"
                aria-label="Parar"
                data-testid="button-stop"
              >
                <span className="h-3 w-3 rounded-sm bg-destructive" />
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() && attachments.length === 0}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition",
                  (input.trim() || attachments.length > 0)
                    ? "bg-[color:var(--amber)] text-[color:var(--amber-foreground)] shadow-[var(--shadow-amber-glow)]"
                    : "bg-muted text-muted-foreground",
                )}
                aria-label="Enviar"
                data-testid="button-send"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex min-h-4 items-center gap-2 px-1">
          {webSearch && <span className="font-mono text-[9px] text-[color:var(--cyan-glow)]">web:ativo</span>}
          {debugMode && <span className="font-mono text-[9px] text-red-400">debug:ativo</span>}
          <span className="ml-auto text-[10px] text-muted-foreground">Enter · Shift + Enter</span>
        </div>
      </div>
    </div>
  );
}

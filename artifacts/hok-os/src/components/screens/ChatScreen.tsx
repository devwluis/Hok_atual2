"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Bug, Send, Copy, Webhook, ChevronDown, ChevronUp } from "lucide-react";
import { ElectricCore } from "@/components/chat/ElectricCore";
import { NuclearCore } from "@/components/chat/NuclearCore";
import { cn } from "@/lib/utils";
import { conversationsStore, type ChatMessage } from "@/lib/conversations-store";
import { useAppState } from "@/hooks/use-app-state";
import { HOK_MODELS, getModel } from "@/lib/hok-models";

// Unified settings key
const SETTINGS_KEY = "hokma.settings.v1";
const N8N_SETTINGS_KEY = "hokma.n8n.settings.v1";

type Msg = ChatMessage & {
  meta?: { ms: number; model?: string };
};

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { serverUrl: "", token: "" };
    const s = JSON.parse(raw) as Record<string, string>;
    return { serverUrl: s["Server URL"] || "", token: s["HOK_TOKEN"] || "" };
  } catch {
    return { serverUrl: "", token: "" };
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

// ── Model picker strip ────────────────────────────────────────────────────────
function ModelPicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 thin-scroll">
      {HOK_MODELS.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          title={m.description}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            selected === m.id
              ? "border-transparent text-black"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
          style={selected === m.id ? { background: m.color } : undefined}
        >
          <span className="text-[10px]">{m.label}</span>
        </button>
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

  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Accumulator ref — accessible in async closure without stale value issues
  const accRef = useRef<string>("");

  const activeModel = getModel(selectedModel);

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
      setWebhookResult(res.ok ? `✓ Enviado! (${res.status})` : `Erro ${res.status}`);
    } catch {
      setWebhookResult("Falha ao enviar para o webhook.");
    }
    setTimeout(() => setWebhookResult(null), 3000);
  };

  const send = async () => {
    const t = input.trim();
    if (!t || loading) return;

    setError(null);
    let id = conversationId;
    if (!id) {
      const c = conversationsStore.create(t.slice(0, 40));
      id = c.id;
      setConversationId(id);
    }

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: t };
    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    persist(afterUser, id);
    setInput("");
    setLoading(true);
    accRef.current = "";

    const { serverUrl, token } = readSettings();

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

    try {
      const { streamChat } = await import("@/lib/chat-stream");
      await streamChat({
        baseUrl,
        endpointPath,
        token,
        webSearch,
        selectedModel,
        messages: afterUser.map((m) => ({ role: m.role, content: m.text })),
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
        text: accRef.current || "…",
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
    <div className="flex h-full flex-col bg-background">
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
                  label="Processando requisição…"
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
          <button onClick={() => setError(null)} className="shrink-0 text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Webhook result ── */}
      {webhookResult && (
        <div className="mx-4 mb-2 rounded-xl border border-[color:var(--amber)]/30 bg-[color:var(--amber)]/10 px-4 py-2 text-sm text-[color:var(--amber)]">
          {webhookResult}
        </div>
      )}

      {/* ── No settings info ── */}
      {messages.length === 0 && !loading && !serverUrl && (
        <div className="mx-4 mb-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          Operando via IA interna (Groq). Configure <strong>Server URL</strong> + <strong>HOK_TOKEN</strong> nas Configurações para conectar ao servidor HOK.
        </div>
      )}

      {/* ── Input area ── */}
      <div className="border-t border-border bg-card/80 px-4 pb-[calc(env(safe-area-inset-bottom)+80px)] pt-3 backdrop-blur-xl">

        {/* Model picker (collapsible) */}
        <AnimatePresence>
          {showModelPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2"
            >
              <ModelPicker selected={selectedModel} onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea row */}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-[color:var(--amber)] focus-within:shadow-[var(--shadow-amber-glow)] transition-all">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Insira sua instrução, Sr.…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{ maxHeight: 120 }}
          />
          <div className="flex items-center gap-1 pb-0.5">
            {/* Web search toggle */}
            <button
              onClick={() => setWebSearch((v) => !v)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                webSearch ? "bg-[color:var(--amber)]/15 text-[color:var(--amber)]" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-label="Busca web"
            >
              <Globe className="h-4 w-4" />
            </button>

            {/* Debug toggle */}
            <button
              onClick={() => setDebugMode((v) => !v)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                debugMode ? "bg-red-500/15 text-red-500" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-label="Debug"
            >
              <Bug className="h-4 w-4" />
            </button>

            {/* Send / Stop */}
            {loading ? (
              <button
                onClick={stop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25"
                aria-label="Parar"
              >
                <span className="h-3 w-3 rounded-sm bg-destructive" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition",
                  input.trim()
                    ? "bg-[color:var(--amber)] text-[color:var(--amber-foreground)] shadow-[var(--shadow-amber-glow)]"
                    : "bg-muted text-muted-foreground",
                )}
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom bar: model selector trigger + hint */}
        <div className="mt-1.5 flex items-center gap-2 px-1">
          <button
            onClick={() => setShowModelPicker((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-[color:var(--amber)]/40"
            style={{ color: activeModel.color }}
          >
            <span className="font-mono">{activeModel.label}</span>
            {showModelPicker ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {webSearch && (
            <span className="text-[10px] font-mono text-[color:var(--cyan-glow)]">web:on</span>
          )}
          {debugMode && (
            <span className="text-[10px] font-mono text-red-500">debug:on</span>
          )}

          <span className="ml-auto text-[10px] text-muted-foreground">Enter · Shift↵ nova linha</span>
        </div>
      </div>
    </div>
  );
}

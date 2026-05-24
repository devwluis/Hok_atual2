import React, { useState, useRef, useEffect, useCallback } from "react";
import type { AppState } from "@/App";
import {
  uuid, formatTime,
  apiChatStream, readFileFromServer, buildFileContext, orchestrateModel,
  MODELS,
  type Message, type AttachedFile, type OrchestratorResult,
} from "@/lib/store";

// ─── Markdown renderer ────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre><code class="lang-${lang}">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>");
}

// ─── Message bubble ───────────────────────────────────────────────
function MessageBubble({ msg, streaming }: { msg: Message; streaming?: boolean }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      gap: 4, animation: "fadeUp 180ms ease-out both",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: isUser ? "var(--accent)" : "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {isUser ? "você" : "hok"}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatTime(msg.ts)}</span>
        {msg.model && (
          <span style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
            color: "var(--text-muted)", background: "var(--bg-elevated)",
            border: "1px solid var(--border)", borderRadius: 2, padding: "0 5px",
          }}>
            {MODELS.find((m) => m.id === msg.model)?.label ?? msg.model}
          </span>
        )}
        {streaming && (
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "var(--accent)", animation: "ping 1.5s ease-in-out infinite" }}>
            streaming
          </span>
        )}
      </div>

      <div style={{
        maxWidth: "82%", padding: "10px 14px",
        background: isUser ? "var(--accent-dim)" : "var(--bg-elevated)",
        border: `1px solid ${isUser ? "var(--border-glow)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        borderLeft: isUser ? undefined : "2px solid var(--accent)",
      }}>
        {isUser ? (
          <p style={{ color: "var(--text-primary)", fontSize: 13, whiteSpace: "pre-wrap" }}>{msg.content}</p>
        ) : (
          <div style={{ fontSize: 13, position: "relative" }}>
            <div className="prose-hok" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
            {streaming && (
              <span aria-hidden style={{
                display: "inline-block", width: 7, height: 14,
                background: "var(--accent)", verticalAlign: "text-bottom",
                marginLeft: 2, borderRadius: 1, animation: "blink 1s step-end infinite",
              }} />
            )}
          </div>
        )}
      </div>

      {!isUser && !streaming && msg.content && (
        <button onClick={copy} className="hok-btn ghost" style={{ padding: "2px 8px", fontSize: 10, opacity: 0.5 }}>
          {copied ? "copiado" : "copiar"}
        </button>
      )}
    </div>
  );
}

function ConnectingBubble() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, animation: "fadeUp 180ms ease-out both" }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>hok</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "2px solid var(--accent)", borderRadius: "var(--radius)" }}>
        <div className="loading-dots" style={{ display: "flex", alignItems: "center" }}><span /><span /><span /></div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>conectando</span>
      </div>
    </div>
  );
}

// ─── File panel ───────────────────────────────────────────────────
const QUICK_PATHS = [
  "/sdcard", "/sdcard/Download", "~/", "~/.config",
  "/data/data/com.termux/files/home",
  "/sdcard/projects", "/sdcard/code",
];

function FilePanel({
  config,
  onAttach,
  onClose,
}: {
  config: AppState["config"];
  onAttach: (f: AttachedFile) => void;
  onClose: () => void;
}) {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AttachedFile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const read = async (p: string) => {
    const target = p || path;
    if (!target.trim()) return;
    setErr(null);
    setLoading(true);
    try {
      const f = await readFileFromServer(config, target.trim());
      setPreview(f);
      setPath(target.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao ler arquivo");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const attach = () => {
    if (!preview) return;
    onAttach(preview);
    setPreview(null);
    setPath("");
    onClose();
  };

  return (
    <div style={{
      position: "absolute", bottom: "calc(100% + 6px)", left: 0,
      width: 480, maxWidth: "calc(100vw - 40px)",
      background: "var(--bg-surface)", border: "1px solid var(--border-glow)",
      borderRadius: "var(--radius)", zIndex: 300,
      boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        <span className="hok-label">Anexar arquivo do servidor</span>
        <button className="hok-btn ghost" style={{ padding: "2px 8px", fontSize: 12 }} onClick={onClose}>×</button>
      </div>

      {/* Quick paths */}
      <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {QUICK_PATHS.map((p) => (
          <button key={p} className="hok-cmd" style={{ fontSize: 10 }} onClick={() => { setPath(p); }}>
            {p.replace("/data/data/com.termux/files/home", "~/termux")}
          </button>
        ))}
      </div>

      {/* Path input */}
      <div style={{ padding: "10px 14px", display: "flex", gap: 8 }}>
        <input
          className="hok-input"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/sdcard/projects/app/main.py"
          onKeyDown={(e) => e.key === "Enter" && read(path)}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}
          autoFocus
        />
        <button
          className="hok-btn primary"
          onClick={() => read(path)}
          disabled={loading || !path.trim()}
          style={{ flexShrink: 0, padding: "6px 14px" }}
        >
          {loading ? "..." : "Ler"}
        </button>
      </div>

      {/* Error */}
      {err && (
        <div style={{ padding: "6px 14px 10px", color: "var(--offline)", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          {err}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--accent)" }}>
              {preview.path}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                {preview.lines} linhas{preview.truncated ? " (truncado)" : ""}
              </span>
              <button className="hok-btn primary" onClick={attach} style={{ padding: "4px 12px", fontSize: 11 }}>
                Anexar
              </button>
            </div>
          </div>
          <pre style={{
            maxHeight: 160, overflowY: "auto", margin: 0,
            padding: "10px 14px", fontSize: 11,
            background: "var(--bg-deep)", borderRadius: 0,
            border: "none", color: "var(--text-secondary)",
          }}>
            {preview.content.slice(0, 1200)}{preview.content.length > 1200 ? "\n…" : ""}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Orchestrator mode bar ────────────────────────────────────────
type ChatMode = "auto" | "manual";

function ModeBar({
  mode, setMode, orchResult,
}: {
  mode: ChatMode;
  setMode: (m: ChatMode) => void;
  orchResult: OrchestratorResult | null;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "6px 20px", borderBottom: "1px solid var(--border)",
      background: "var(--bg-surface)", flexShrink: 0,
    }}>
      {/* Mode toggle */}
      <div style={{
        display: "flex", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", overflow: "hidden",
      }}>
        {(["auto", "manual"] as ChatMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "4px 14px", fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              background: mode === m ? "var(--accent-dim)" : "transparent",
              color: mode === m ? "var(--accent)" : "var(--text-muted)",
              border: "none",
              borderRight: m === "auto" ? "1px solid var(--border)" : "none",
              cursor: "pointer", transition: "background 120ms, color 120ms",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}
          >
            {m === "auto" ? "⬡ Auto" : "◈ Manual"}
          </button>
        ))}
      </div>

      {/* Indicator */}
      {mode === "auto" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
          {orchResult ? (
            <>
              <span style={{ color: "var(--accent)", fontFamily: "'IBM Plex Mono', monospace" }}>
                {orchResult.label}
              </span>
              <span>selecionado por</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-secondary)" }}>
                {orchResult.reason}
              </span>
            </>
          ) : (
            <span style={{ fontStyle: "italic" }}>IA será escolhida automaticamente ao enviar</span>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          usando modelo do seletor no topo
        </div>
      )}
    </div>
  );
}

// ─── Attached file chip ───────────────────────────────────────────
function FileChips({
  files, onRemove,
}: {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}) {
  if (files.length === 0) return null;
  return (
    <div style={{
      display: "flex", gap: 6, flexWrap: "wrap",
      padding: "6px 14px 0",
    }}>
      {files.map((f) => (
        <div key={f.id} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 8px 3px 10px",
          background: "var(--accent-dim)",
          border: "1px solid var(--border-glow)",
          borderRadius: 2,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: "var(--accent)",
        }}>
          <span>📄</span>
          <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {f.path.split("/").pop()}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 9 }}>{f.lines}L</span>
          <button
            onClick={() => onRemove(f.id)}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Chat page ───────────────────────────────────────────────
export default function ChatPage({ state }: { state: AppState }) {
  const { config, model, setModel, activeConv, activeConvId, newConversation, addMessage, updateLastAssistant } = state;

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [waitingFirst, setWaitingFirst] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>("manual");
  const [orchResult, setOrchResult] = useState<OrchestratorResult | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [filePanelOpen, setFilePanelOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  const messages = activeConv?.messages ?? [];

  // Auto-preview orchestrator result as user types (debounced)
  useEffect(() => {
    if (mode !== "auto" || !input.trim()) { setOrchResult(null); return; }
    const t = setTimeout(() => {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setOrchResult(orchestrateModel(input.trim(), history));
    }, 300);
    return () => clearTimeout(t);
  }, [input, mode, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Close file panel on outside click
  useEffect(() => {
    if (!filePanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
        setFilePanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filePanelOpen]);

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setWaitingFirst(false);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const removeFile = (id: string) => setAttachedFiles((prev) => prev.filter((f) => f.id !== id));

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    // Determine model to use
    let activeModel = model;
    let usedOrch: OrchestratorResult | null = null;

    if (mode === "auto") {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      usedOrch = orchestrateModel(text, history);
      activeModel = usedOrch.modelId;
      // Temporarily update the displayed model so topbar shows it
      setModel(activeModel);
      setOrchResult(usedOrch);
    }

    // Build final message with file context
    const fileCtx = buildFileContext(attachedFiles);
    const fullContent = fileCtx ? `${fileCtx}${text}` : text;

    setInput("");
    setError(null);
    setAttachedFiles([]);
    setFilePanelOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (!activeConvId) newConversation();

    const userMsg: Message = { id: uuid(), role: "user", content: text, ts: Date.now(), model: activeModel };
    addMessage(userMsg);

    const placeholder: Message = { id: uuid(), role: "assistant", content: "", ts: Date.now(), model: activeModel };
    addMessage(placeholder);

    bufferRef.current = "";
    setWaitingFirst(true);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Build history — inject file context into the LAST user message content
    const history = [...messages, { ...userMsg, content: fullContent }].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    await apiChatStream(
      config,
      history,
      activeModel,
      (token) => {
        bufferRef.current += token;
        setWaitingFirst(false);
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            updateLastAssistant(bufferRef.current);
            rafRef.current = null;
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          });
        }
      },
      () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        if (bufferRef.current) updateLastAssistant(bufferRef.current);
        setStreaming(false);
        setWaitingFirst(false);
        abortRef.current = null;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      },
      (err) => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        updateLastAssistant(
          bufferRef.current
            ? bufferRef.current + `\n\n_[interrompido: ${err}]_`
            : `_Erro: ${err}_`,
        );
        setError(err);
        setStreaming(false);
        setWaitingFirst(false);
        abortRef.current = null;
      },
      ctrl.signal,
    );
  }, [input, streaming, config, model, mode, messages, attachedFiles, activeConvId, newConversation, addMessage, updateLastAssistant, setModel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Welcome screen ─────────────────────────────────────────────
  if (!activeConv) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", gap: 24 }}>
        <div style={{ color: "var(--accent)", fontSize: 48, filter: "drop-shadow(0 0 12px rgba(99,179,237,0.5))", lineHeight: 1 }}>⬡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>HOK AI Agent</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400, lineHeight: 1.7 }}>
            Conectado ao seu servidor Termux. Use o modo <strong style={{ color: "var(--accent)" }}>Auto</strong> para deixar o HOK escolher a melhor IA ou <strong style={{ color: "var(--accent)" }}>Manual</strong> para escolher você mesmo.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="hok-btn primary" onClick={() => { setMode("auto"); state.newConversation(); }} style={{ padding: "9px 22px" }}>
            ⬡ Auto — HOK escolhe
          </button>
          <button className="hok-btn" onClick={() => { setMode("manual"); state.newConversation(); }} style={{ padding: "9px 22px" }}>
            ◈ Manual — eu escolho
          </button>
        </div>
      </div>
    );
  }

  // ── Chat ───────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Mode bar */}
      <ModeBar mode={mode} setMode={setMode} orchResult={orchResult} />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 12px", display: "flex", flexDirection: "column", gap: 18 }}>
        {messages.filter((m) => m.role !== "system").map((msg, i) => {
          const isStreamingThis = streaming && i === messages.length - 1 && msg.role === "assistant";
          if (isStreamingThis && waitingFirst && msg.content === "") return <ConnectingBubble key={msg.id} />;
          return <MessageBubble key={msg.id} msg={msg} streaming={isStreamingThis} />;
        })}

        {error && (
          <div style={{ padding: "8px 14px", background: "rgba(252,129,129,0.08)", border: "1px solid rgba(252,129,129,0.2)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--offline)", fontFamily: "'IBM Plex Mono', monospace" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0 }}>
        {/* Attached file chips */}
        <FileChips files={attachedFiles} onRemove={removeFile} />

        <div style={{ padding: "10px 14px 12px", position: "relative" }} ref={inputWrapRef}>
          {/* File panel */}
          {filePanelOpen && (
            <FilePanel
              config={config}
              onAttach={(f) => setAttachedFiles((prev) => [...prev, f])}
              onClose={() => setFilePanelOpen(false)}
            />
          )}

          {/* Textarea row */}
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "var(--bg-elevated)",
            border: `1px solid ${streaming ? "var(--border-glow)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            padding: "8px 8px 8px 12px",
            transition: "border-color 160ms",
          }}>
            {/* Attach button */}
            <button
              onClick={() => setFilePanelOpen((v) => !v)}
              disabled={streaming}
              title="Anexar arquivo do servidor"
              style={{
                background: filePanelOpen ? "var(--accent-dim)" : "none",
                border: `1px solid ${filePanelOpen ? "var(--border-glow)" : "var(--border)"}`,
                borderRadius: 2, padding: "5px 8px", cursor: "pointer",
                color: filePanelOpen ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                flexShrink: 0, transition: "all 120ms",
                alignSelf: "flex-end",
              }}
            >
              {attachedFiles.length > 0
                ? <span style={{ color: "var(--accent)" }}>[{attachedFiles.length}]</span>
                : "attach"}
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={streaming ? "Aguardando resposta..." : mode === "auto" ? "Mensagem... (HOK escolhe a IA)" : "Mensagem... (Enter para enviar)"}
              rows={1}
              disabled={streaming}
              style={{
                flex: 1, background: "none", border: "none",
                color: streaming ? "var(--text-muted)" : "var(--text-primary)",
                fontFamily: "'Inter', sans-serif", fontSize: 13,
                resize: "none", outline: "none", lineHeight: 1.6,
                maxHeight: 140, overflowY: "auto", transition: "color 160ms",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 140) + "px";
              }}
            />

            {streaming ? (
              <button onClick={cancel} className="hok-btn" style={{ padding: "6px 14px", fontSize: 12, flexShrink: 0, borderColor: "var(--offline)", color: "var(--offline)", alignSelf: "flex-end" }}>
                Cancelar
              </button>
            ) : (
              <button onClick={send} disabled={!input.trim()} className="hok-btn primary" style={{ padding: "6px 14px", fontSize: 12, flexShrink: 0, alignSelf: "flex-end" }}>
                Enviar
              </button>
            )}
          </div>

          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              {streaming ? (
                <span style={{ color: "var(--accent)" }}>streaming · {bufferRef.current.length} chars</span>
              ) : attachedFiles.length > 0 ? (
                <span style={{ color: "var(--accent)" }}>{attachedFiles.length} arquivo(s) no contexto · Shift+Enter nova linha</span>
              ) : (
                "Shift+Enter nova linha · Enter enviar"
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {mode === "auto" && orchResult && !streaming && (
                <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "var(--accent)" }}>
                  ⬡ {orchResult.label}
                </span>
              )}
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
                {messages.filter((m) => m.role !== "system").length} msgs
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

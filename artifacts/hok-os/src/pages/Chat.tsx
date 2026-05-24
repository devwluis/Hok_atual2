import React, { useState, useRef, useEffect, useCallback } from "react";
import type { AppState } from "@/App";
import { uuid, formatTime, apiChatStream, type Message } from "@/lib/store";

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
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      gap: 4,
      animation: "fadeUp 180ms ease-out both",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: isUser ? "var(--accent)" : "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          {isUser ? "você" : "hok"}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatTime(msg.ts)}</span>
        {streaming && (
          <span style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: "var(--accent)",
            animation: "ping 1.5s ease-in-out infinite",
          }}>
            streaming
          </span>
        )}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "80%",
        padding: "10px 14px",
        background: isUser ? "var(--accent-dim)" : "var(--bg-elevated)",
        border: `1px solid ${isUser ? "var(--border-glow)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        borderLeft: isUser ? undefined : "2px solid var(--accent)",
      }}>
        {isUser ? (
          <p style={{ color: "var(--text-primary)", fontSize: 13, whiteSpace: "pre-wrap" }}>
            {msg.content}
          </p>
        ) : (
          <div style={{ fontSize: 13, position: "relative" }}>
            <div
              className="prose-hok"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />
            {streaming && (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 14,
                  background: "var(--accent)",
                  verticalAlign: "text-bottom",
                  marginLeft: 2,
                  animation: "blink 1s step-end infinite",
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Copy — only when done */}
      {!isUser && !streaming && msg.content && (
        <button
          onClick={copy}
          className="hok-btn ghost"
          style={{ padding: "2px 8px", fontSize: 10, opacity: 0.5 }}
        >
          {copied ? "copiado" : "copiar"}
        </button>
      )}
    </div>
  );
}

// ─── Connecting dots (while waiting for first token) ─────────────
function ConnectingBubble() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 4,
      animation: "fadeUp 180ms ease-out both",
    }}>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        hok
      </span>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--accent)",
        borderRadius: "var(--radius)",
      }}>
        <div className="loading-dots" style={{ display: "flex", alignItems: "center" }}>
          <span /><span /><span />
        </div>
        <span style={{
          fontSize: 11,
          color: "var(--text-muted)",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          conectando
        </span>
      </div>
    </div>
  );
}

// ─── Main Chat page ───────────────────────────────────────────────
export default function ChatPage({ state }: { state: AppState }) {
  const {
    config, model, activeConv, activeConvId,
    newConversation, addMessage, updateLastAssistant,
  } = state;

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [waitingFirst, setWaitingFirst] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Accumulate tokens here to avoid stale closure in onChunk
  const bufferRef = useRef("");
  // RAF handle for throttled state updates
  const rafRef = useRef<number | null>(null);

  const messages = activeConv?.messages ?? [];
  const lastMsg = messages[messages.length - 1];
  const isLastAssistant = lastMsg?.role === "assistant";

  // Auto-scroll as tokens stream in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming]);

  // Cancel on unmount
  useEffect(() => () => {
    abortRef.current?.abort();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setWaitingFirst(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Ensure we have an active conversation
    if (!activeConvId) newConversation();

    const userMsg: Message = {
      id: uuid(), role: "user", content: text, ts: Date.now(), model,
    };
    addMessage(userMsg);

    // Placeholder assistant message (empty = waiting)
    const assistantMsg: Message = {
      id: uuid(), role: "assistant", content: "", ts: Date.now(), model,
    };
    addMessage(assistantMsg);

    bufferRef.current = "";
    setWaitingFirst(true);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const history = [...messages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    await apiChatStream(
      config,
      history,
      model,
      // onChunk — called for every token
      (token) => {
        bufferRef.current += token;
        setWaitingFirst(false);
        // Throttle React state updates with rAF
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            updateLastAssistant(bufferRef.current);
            rafRef.current = null;
            // Keep scrolling as tokens arrive
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          });
        }
      },
      // onDone
      () => {
        // Flush remaining buffer
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (bufferRef.current) {
          updateLastAssistant(bufferRef.current);
        }
        setStreaming(false);
        setWaitingFirst(false);
        abortRef.current = null;
        // Final scroll
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      },
      // onError
      (err) => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
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
  }, [input, streaming, config, model, messages, activeConvId, newConversation, addMessage, updateLastAssistant]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Welcome screen ─────────────────────────────────────────────
  if (!activeConv) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 40, textAlign: "center", gap: 24,
      }}>
        <div style={{
          color: "var(--accent)",
          fontSize: 48,
          filter: "drop-shadow(0 0 12px rgba(99,179,237,0.5))",
          lineHeight: 1,
        }}>⬡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            HOK AI Agent
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 380, lineHeight: 1.7 }}>
            Conectado ao seu servidor Termux. Inicie uma conversa ou selecione uma no painel lateral.
          </div>
        </div>
        <button
          className="hok-btn primary"
          onClick={() => state.newConversation()}
          style={{ padding: "9px 24px" }}
        >
          Iniciar conversa
        </button>
      </div>
    );
  }

  // ── Chat ───────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Message list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 28px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
        {messages.filter((m) => m.role !== "system").map((msg, i) => {
          const isStreamingThis =
            streaming &&
            i === messages.length - 1 &&
            msg.role === "assistant";

          // Show connecting dots while waiting for first token
          if (isStreamingThis && waitingFirst && msg.content === "") {
            return <ConnectingBubble key={msg.id} />;
          }

          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              streaming={isStreamingThis}
            />
          );
        })}

        {error && (
          <div style={{
            padding: "8px 14px",
            background: "rgba(252,129,129,0.08)",
            border: "1px solid rgba(252,129,129,0.2)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "var(--offline)",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "12px 20px 16px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          gap: 8,
          background: "var(--bg-elevated)",
          border: `1px solid ${streaming ? "var(--border-glow)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "8px 8px 8px 14px",
          transition: "border-color 160ms",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={streaming ? "Aguardando resposta..." : "Mensagem... (Enter para enviar)"}
            rows={1}
            disabled={streaming}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: streaming ? "var(--text-muted)" : "var(--text-primary)",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              resize: "none",
              outline: "none",
              lineHeight: 1.6,
              maxHeight: 140,
              overflowY: "auto",
              transition: "color 160ms",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 140) + "px";
            }}
          />

          {streaming ? (
            <button
              onClick={cancel}
              className="hok-btn"
              style={{
                padding: "6px 14px",
                alignSelf: "flex-end",
                fontSize: 12,
                borderColor: "var(--offline)",
                color: "var(--offline)",
              }}
            >
              Cancelar
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="hok-btn primary"
              style={{ padding: "6px 14px", alignSelf: "flex-end", fontSize: 12 }}
            >
              Enviar
            </button>
          )}
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 5,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            {streaming ? (
              <span style={{ color: "var(--accent)" }}>
                streaming · {bufferRef.current.length} chars
              </span>
            ) : (
              "Shift+Enter nova linha · Enter enviar"
            )}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            {messages.filter(m => m.role !== "system").length} msgs
          </span>
        </div>
      </div>
    </div>
  );
}

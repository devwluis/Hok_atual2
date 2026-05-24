import React, { useState, useRef, useEffect, useCallback } from "react";
import type { AppState } from "@/App";
import { uuid, formatTime, apiChat, type Message } from "@/lib/store";

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => `<pre><code class="lang-${lang}">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hup])(.+)$/gm, (line) => line.trim() ? line : "");
}

function MessageBubble({ msg, onCopy }: { msg: Message; onCopy: (t: string) => void }) {
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
      animationFillMode: "both",
      animation: "fadeUp 180ms ease-out both",
    }}>
      {/* Sender row */}
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
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "80%",
        padding: "10px 14px",
        background: isUser ? "var(--accent-dim)" : "var(--bg-elevated)",
        border: `1px solid ${isUser ? "var(--border-glow)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        borderLeft: isUser ? undefined : `2px solid var(--accent)`,
        position: "relative",
      }}>
        {isUser ? (
          <p style={{ color: "var(--text-primary)", fontSize: 13, whiteSpace: "pre-wrap" }}>{msg.content}</p>
        ) : (
          <div
            className="prose-hok"
            style={{ fontSize: 13 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        )}
      </div>

      {/* Copy btn */}
      {!isUser && (
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

function LoadingBubble() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "2px solid var(--accent)", borderRadius: "var(--radius)", width: "fit-content" }}>
      <div className="loading-dots" style={{ display: "flex", alignItems: "center" }}>
        <span /><span /><span />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>pensando</span>
    </div>
  );
}

export default function ChatPage({ state }: { state: AppState }) {
  const { config, model, activeConv, activeConvId, newConversation, addMessage, updateLastAssistant } = state;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeConv?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    if (!activeConvId) newConversation();

    const userMsg: Message = { id: uuid(), role: "user", content: text, ts: Date.now(), model };
    addMessage(userMsg);

    const placeholder: Message = { id: uuid(), role: "assistant", content: "", ts: Date.now(), model };
    addMessage(placeholder);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const reply = await apiChat(config, history, model);
      updateLastAssistant(reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de rede";
      updateLastAssistant(`_Erro: ${msg}_`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, config, model, messages, activeConvId, newConversation, addMessage, updateLastAssistant]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // No conversation → welcome
  if (!activeConv) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 40, textAlign: "center", gap: 24,
      }}>
        <div style={{ color: "var(--accent)", fontSize: 48, filter: "drop-shadow(0 0 12px rgba(99,179,237,0.5))", lineHeight: 1 }}>⬡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>HOK AI Agent</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 380, lineHeight: 1.7 }}>
            Conectado ao seu servidor Termux. Inicie uma conversa ou selecione uma no painel lateral.
          </div>
        </div>
        <button className="hok-btn primary" onClick={() => state.newConversation()} style={{ padding: "9px 24px" }}>
          Iniciar conversa
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 12px", display: "flex", flexDirection: "column", gap: 20 }}>
        {messages.filter((m) => m.role !== "system").map((msg, i) => {
          if (msg.role === "assistant" && msg.content === "" && i === messages.length - 1 && loading) {
            return <LoadingBubble key={msg.id} />;
          }
          return <MessageBubble key={msg.id} msg={msg} onCopy={() => {}} />;
        })}
        {error && (
          <div style={{ padding: "8px 14px", background: "rgba(252,129,129,0.08)", border: "1px solid rgba(252,129,129,0.2)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--offline)" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 20px 16px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}>
        <div style={{
          display: "flex",
          gap: 8,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "8px 8px 8px 14px",
          transition: "border-color 120ms, box-shadow 120ms",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Mensagem... (Enter para enviar)"
            rows={1}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              resize: "none",
              outline: "none",
              lineHeight: 1.6,
              maxHeight: 140,
              overflowY: "auto",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 140) + "px";
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="hok-btn primary"
            style={{ padding: "6px 14px", alignSelf: "flex-end", fontSize: 12 }}
          >
            {loading ? "..." : "Enviar"}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            Shift+Enter nova linha · Enter enviar
          </span>
        </div>
      </div>
    </div>
  );
}

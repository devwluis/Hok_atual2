import React, { useState, useRef, useEffect, useCallback } from "react";
import type { AppState } from "@/App";
import { apiShell } from "@/lib/store";

interface TermLine {
  type: "cmd" | "out" | "err" | "info";
  text: string;
  ts: number;
}

const BANNER: TermLine[] = [
  { type: "info", text: "HOK OS Terminal · Termux Shell Bridge", ts: Date.now() },
  { type: "info", text: "Comandos são executados no seu dispositivo Android via HOK Server", ts: Date.now() },
  { type: "info", text: "──────────────────────────────────────────────────────", ts: Date.now() },
];

const QUICK_CMDS = [
  { label: "ls -la",         cmd: "ls -la /sdcard" },
  { label: "uname",          cmd: "uname -a" },
  { label: "df -h",          cmd: "df -h /sdcard" },
  { label: "ps",             cmd: "ps aux | head -15" },
  { label: "cat termux-id",  cmd: "termux-info 2>/dev/null || getprop ro.product.model" },
  { label: "ping 1.1.1.1",   cmd: "ping -c 3 1.1.1.1" },
];

export default function TerminalPage({ state }: { state: AppState }) {
  const { config, status } = state;
  const [lines, setLines] = useState<TermLine[]>(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const run = useCallback(async (cmd: string) => {
    const c = cmd.trim();
    if (!c) return;
    setLines((l) => [...l, { type: "cmd", text: `$ ${c}`, ts: Date.now() }]);
    setHistory((h) => [c, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput("");
    setRunning(true);

    try {
      const { output, sucesso } = await apiShell(config, c);
      const outLines = output.split("\n").filter((l) => l !== undefined);
      setLines((l) => [
        ...l,
        ...outLines.map((t) => ({ type: sucesso ? "out" as const : "err" as const, text: t, ts: Date.now() })),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      setLines((l) => [...l, { type: "err", text: `Erro: ${msg}`, ts: Date.now() }]);
    } finally {
      setRunning(false);
    }
  }, [config]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { run(input); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : history[idx] ?? "");
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines(BANNER);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        overflowX: "auto",
        flexShrink: 0,
      }}>
        <span className="hok-label" style={{ flexShrink: 0 }}>Quick</span>
        {QUICK_CMDS.map((q) => (
          <button
            key={q.label}
            className="hok-cmd"
            onClick={() => run(q.cmd)}
            disabled={running}
          >
            {q.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="hok-btn ghost"
          onClick={() => setLines(BANNER)}
          style={{ padding: "3px 10px", fontSize: 11 }}
        >
          Limpar
        </button>
      </div>

      {/* Output */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          lineHeight: 1.7,
          cursor: "text",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.type === "cmd" ? "terminal-line-cmd"
                : line.type === "err" ? "terminal-line-err"
                : line.type === "info" ? ""
                : "terminal-line-out"
            }
            style={{
              color: line.type === "info" ? "var(--text-muted)" : undefined,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              userSelect: "text",
            }}
          >
            {line.text}
          </div>
        ))}
        {running && (
          <div style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <div className="loading-dots" style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span /><span /><span />
            </div>
            executando
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          color: status === "online" ? "var(--online)" : "var(--offline)",
          flexShrink: 0,
        }}>
          {status === "online" ? "●" : "○"} $
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Digite um comando..."
          autoFocus
          disabled={running}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
          }}
        />
        {running && <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>Ctrl+C (not impl)</span>}
      </div>

      <div style={{ padding: "4px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)", display: "flex", gap: 16 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
          ↑↓ historico · Ctrl+L limpar
        </span>
      </div>
    </div>
  );
}

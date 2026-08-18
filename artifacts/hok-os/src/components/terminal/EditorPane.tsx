"use client";
import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { go } from "@codemirror/lang-go";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { FileText, X } from "lucide-react";

const SETTINGS_KEY = "hokma.settings.v1";

function readServer(): { url: string; token: string } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { url: "", token: "" };
    const s = JSON.parse(raw) as Record<string, string>;
    return { url: s["Server URL"] || "", token: s["HOK_TOKEN"] || "" };
  } catch {
    return { url: "", token: "" };
  }
}

function langFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts": case "tsx": case "js": case "jsx": case "mjs": case "cjs":
      return [javascript({ jsx: ext === "tsx" || ext === "jsx", typescript: ext === "ts" || ext === "tsx" })];
    case "json": return [json()];
    case "py": return [python()];
    case "go": return [go()];
    case "css": case "scss": case "less": return [css()];
    case "html": case "htm": case "vue": return [html()];
    default: return [];
  }
}

async function fsRead(path: string, signal?: AbortSignal): Promise<string> {
  const { url, token } = readServer();
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers["X-Hok-Token"] = token;
  const res = await fetch(url.replace(/\/$/, "") + "/fs/read", {
    method: "POST",
    headers,
    body: JSON.stringify({ path }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { status?: string; data?: { content?: string } };
  return data.data?.content ?? "";
}

export function EditorPane({
  filePath,
  onClose,
}: {
  filePath: string | null;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) { setContent(""); setError(null); return; }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fsRead(filePath, ctrl.signal)
      .then((c) => setContent(c))
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [filePath]);

  const extensions = useMemo(() => (filePath ? langFor(filePath) : []), [filePath]);

  if (!filePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#0d1117]">
        <FileText className="h-8 w-8 text-emerald-700" />
        <span className="font-mono text-[11px] text-emerald-600">Selecione um arquivo no explorador</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-emerald-900/40 bg-[#0a0d12] px-3 py-1.5">
        <span className="flex items-center gap-1.5 truncate font-mono text-[11px] text-emerald-300">
          <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
          <span className="truncate">{filePath.split("/").pop()}</span>
          <span className="truncate text-[10px] text-emerald-600">{filePath}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 shrink-0 rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/15"
          aria-label="Fechar arquivo"
          data-testid="button-editor-close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <div className="border-b border-red-900/40 bg-red-500/10 px-3 py-1.5 font-mono text-[11px] text-red-400">{error}</div>}
      <div className="min-h-0 flex-1 overflow-hidden text-[12.5px]">
        {loading ? (
          <div className="p-3 font-mono text-[11px] text-emerald-600">carregando…</div>
        ) : (
          <CodeMirror
            value={content}
            height="100%"
            theme={oneDark}
            extensions={extensions}
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: false }}
            onChange={(value) => setContent(value)}
            data-testid="code-editor"
          />
        )}
      </div>
    </div>
  );
}

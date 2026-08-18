"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, RefreshCw } from "lucide-react";

export type FsEntry = { name: string; is_dir: boolean; size: number; modified: string };

type Props = {
  serverUrl: string;
  token: string;
  rootPath: string;
  selected: string | null;
  onSelect: (path: string) => void;
};

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

async function fsList(path: string, signal?: AbortSignal): Promise<FsEntry[]> {
  const { url, token } = readServer();
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers["X-Hok-Token"] = token;
  const res = await fetch(url.replace(/\/$/, "") + "/fs/list", {
    method: "POST",
    headers,
    body: JSON.stringify({ path }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { status?: string; data?: FsEntry[] };
  const list = data.data ?? [];
  return list
    .filter((e) => e.name !== ".git")
    .sort((a, b) => (a.is_dir === b.is_dir ? a.name.localeCompare(b.name) : a.is_dir ? -1 : 1));
}

function DirNode({
  path,
  name,
  depth,
  token,
  selected,
  onSelect,
}: {
  path: string;
  name: string;
  depth: number;
  token: string;
  selected: string | null;
  onSelect: (p: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const [children, setChildren] = useState<FsEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setChildren(await fsList(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
      setChildren([]);
    }
  }, [path]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && children === null) await load();
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void toggle()}
        className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] text-emerald-300/90 hover:bg-emerald-500/10"
        style={{ paddingLeft: depth * 12 + 6 }}
        data-testid="tree-dir"
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0 text-emerald-600" /> : <ChevronRight className="h-3 w-3 shrink-0 text-emerald-600" />}
        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
        <span className="truncate">{name}</span>
      </button>
      {open && (
        <div>
          {error && <div className="px-3 text-[10px] text-red-400" style={{ paddingLeft: depth * 12 + 22 }}>{error}</div>}
          {(children ?? []).map((child) =>
            child.is_dir ? (
              <DirNode
                key={child.name}
                path={`${path}/${child.name}`}
                name={child.name}
                depth={depth + 1}
                token={token}
                selected={selected}
                onSelect={onSelect}
              />
            ) : (
              <button
                type="button"
                key={child.name}
                onClick={() => onSelect(`${path}/${child.name}`)}
                className={selected === `${path}/${child.name}`
                  ? "flex w-full items-center gap-1 rounded-md bg-[color:var(--amber)]/15 px-1.5 py-1 text-left text-[11px] text-[color:var(--amber)]"
                  : "flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] text-emerald-300/80 hover:bg-emerald-500/10"}
                style={{ paddingLeft: depth * 12 + 18 }}
                data-testid="tree-file"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">{child.name}</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function FileTree({ serverUrl, token, rootPath, selected, onSelect }: Props) {
  const [roots, setRoots] = useState<FsEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRoot = useCallback(async () => {
    try {
      setError(null);
      setRoots(await fsList(rootPath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro ao listar");
      setRoots([]);
    }
  }, [rootPath]);

  useEffect(() => {
    void loadRoot();
  }, [loadRoot]);

  return (
    <div className="thin-scroll flex h-full flex-col overflow-y-auto bg-[#0a0d12]">
      <div className="flex items-center justify-between border-b border-emerald-900/40 px-2 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/80">Explorador</span>
        <button type="button" onClick={() => void loadRoot()} className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10" aria-label="Atualizar arquivos">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
      <div className="py-1">
        {error && <div className="px-2 text-[10px] text-red-400">{error}</div>}
        {(roots ?? []).map((child) =>
          child.is_dir ? (
            <DirNode
              key={child.name}
              path={`${rootPath}/${child.name}`}
              name={child.name}
              depth={1}
              token={token}
              selected={selected}
              onSelect={onSelect}
            />
          ) : (
            <button
              type="button"
              key={child.name}
              onClick={() => onSelect(`${rootPath}/${child.name}`)}
              className={selected === `${rootPath}/${child.name}`
                ? "flex w-full items-center gap-1 rounded-md bg-[color:var(--amber)]/15 px-1.5 py-1 text-left text-[11px] text-[color:var(--amber)]"
                : "flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] text-emerald-300/80 hover:bg-emerald-500/10"}
              data-testid="tree-file"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{child.name}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

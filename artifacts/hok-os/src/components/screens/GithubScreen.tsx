"use client";
import { GitBranch, GitCommit, GitMerge, ExternalLink } from "lucide-react";
import { ScreenFrame, ScreenHeader, Card } from "@/components/shell/ScreenFrame";

const REPOS = [
  { name: "hokma-app", branch: "main", lastCommit: "feat: unified settings key", time: "há 2h" },
  { name: "n8n-workflows", branch: "main", lastCommit: "fix: webhook imoveis null check", time: "há 5h" },
  { name: "api-gateway", branch: "develop", lastCommit: "refactor: auth middleware", time: "há 1d" },
];

const COMMITS = [
  { hash: "a3f2c1d", msg: "feat: unified settings key (hokma.settings.v1)", author: "washington", time: "2h" },
  { hash: "b8e7a2f", msg: "fix: remove hardcoded token", author: "washington", time: "3h" },
  { hash: "c5d4b3e", msg: "security: add HOK_TOKEN validation to /api/chat", author: "washington", time: "5h" },
];

export function GithubScreen() {
  return (
    <ScreenFrame>
      <ScreenHeader title="GitHub" subtitle="Repositórios e atividade recente." />

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repositórios</div>
      <div className="mb-4 space-y-2">
        {REPOS.map((r) => (
          <Card key={r.name} className="flex items-center gap-3 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/15 text-slate-400 shrink-0">
              <GitBranch className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{r.name}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{r.branch}</span>
              </div>
              <div className="truncate text-[11px] text-muted-foreground">{r.lastCommit}</div>
            </div>
            <button className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
              <ExternalLink className="h-4 w-4" />
            </button>
          </Card>
        ))}
      </div>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Commits Recentes</div>
      <div className="space-y-2">
        {COMMITS.map((c) => (
          <Card key={c.hash} className="flex items-start gap-3 p-3">
            <GitCommit className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-snug">{c.msg}</div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-mono">{c.hash}</span>
                <span>·</span>
                <span>{c.author}</span>
                <span>·</span>
                <span>há {c.time}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScreenFrame>
  );
}

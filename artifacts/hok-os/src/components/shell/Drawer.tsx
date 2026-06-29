"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Plus, Pencil, Check, Trash2, User,
  MessageCircle, Terminal, Workflow, Brain, Settings,
  Bot, Folder, BarChart3, Database, BookOpen, GitBranch,
  Rocket, FileCode, Cpu,
} from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import { conversationsStore } from "@/lib/conversations-store";
import type { ScreenId } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import logo from "@/assets/hokma-logo.png";
import { usePersistentState } from "@/lib/use-persistent-state";

const APPS: { id: ScreenId; label: string; Icon: typeof MessageCircle; color: string }[] = [
  { id: "chat", label: "Chat", Icon: MessageCircle, color: "#f59e0b" },
  { id: "session", label: "Session", Icon: Cpu, color: "#8b5cf6" },
  { id: "terminal", label: "Terminal", Icon: Terminal, color: "#22c55e" },
  { id: "agent", label: "Agent", Icon: Bot, color: "#6366f1" },
  { id: "memory", label: "Memory", Icon: Brain, color: "#ec4899" },
  { id: "deploy", label: "Deploy", Icon: Rocket, color: "#f97316" },
  { id: "github", label: "GitHub", Icon: GitBranch, color: "#94a3b8" },
  { id: "dbstudio", label: "DB Studio", Icon: Database, color: "#06b6d4" },
  { id: "metrics", label: "Metrics", Icon: BarChart3, color: "#a78bfa" },
  { id: "files", label: "Files", Icon: Folder, color: "#fbbf24" },
  { id: "codex", label: "Codex", Icon: BookOpen, color: "#ef4444" },
  { id: "n8n", label: "N8N", Icon: Workflow, color: "#e11d48" },
  { id: "flow", label: "Flow", Icon: FileCode, color: "#14b8a6" },
  { id: "settings", label: "Settings", Icon: Settings, color: "#6b7280" },
];

export function Drawer() {
  const { drawerOpen, toggleDrawer, setScreen, conversationId, setConversationId } = useAppState();
  const [conversations, setConversations] = usePersistentState<
    { id: string; title: string; updatedAt: number }[]
  >("hokma.conversations.v1", []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const refresh = () => {
    const list = conversationsStore.list();
    setConversations(list.map(({ id, title, updatedAt }) => ({ id, title, updatedAt })));
  };

  const navigate = (id: ScreenId) => {
    setScreen(id);
    toggleDrawer(false);
  };

  const newConversation = () => {
    const c = conversationsStore.create("Nova conversa");
    setConversationId(c.id);
    setScreen("chat");
    toggleDrawer(false);
    refresh();
  };

  const openConversation = (id: string) => {
    setConversationId(id);
    setScreen("chat");
    toggleDrawer(false);
  };

  const removeConversation = (id: string) => {
    conversationsStore.remove(id);
    if (conversationId === id) setConversationId(null);
    refresh();
  };

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
  };

  const commitEdit = (id: string) => {
    if (editValue.trim()) conversationsStore.rename(id, editValue.trim());
    setEditingId(null);
    refresh();
  };

  const sorted = conversationsStore.list();

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => toggleDrawer(false)}
          />
          <motion.aside
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <img src={logo} alt="" className="h-7 w-7 rounded-md object-contain" />
                <span className="text-sm font-bold">Finder · Hokmá</span>
              </div>
              <button onClick={() => toggleDrawer(false)} className="rounded-lg p-1.5 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* App grid */}
            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Aplicativos</div>
              <div className="grid grid-cols-4 gap-2">
                {APPS.map(({ id, label, Icon, color }) => (
                  <button
                    key={id}
                    onClick={() => navigate(id)}
                    className="flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-accent"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `${color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </span>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversations */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversas</div>
                <button
                  onClick={newConversation}
                  className="inline-flex items-center gap-1 rounded-full bg-[color:var(--amber)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--amber)] hover:bg-[color:var(--amber)]/25"
                >
                  <Plus className="h-3 w-3" /> Nova
                </button>
              </div>
              <ul className="thin-scroll flex-1 overflow-y-auto px-2 pb-4">
                {sorted.length === 0 && (
                  <li className="px-2 py-4 text-center text-[12px] text-muted-foreground">Nenhuma conversa ainda</li>
                )}
                {sorted.map((c) => {
                  const active = c.id === conversationId;
                  const editing = editingId === c.id;
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                        active ? "bg-[color:var(--amber)]/10" : "hover:bg-accent",
                      )}
                    >
                      <span className={cn("text-sm", active ? "text-[color:var(--amber)]" : "text-muted-foreground")}>
                        📁
                      </span>
                      {editing ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(c.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 rounded bg-background px-1 text-sm outline-none ring-1 ring-[color:var(--amber)]"
                        />
                      ) : (
                        <button
                          onClick={() => openConversation(c.id)}
                          className="flex-1 truncate text-left text-sm font-medium"
                        >
                          {c.title}
                        </button>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editing ? (
                          <button
                            onMouseDown={(e) => { e.preventDefault(); commitEdit(c.id); }}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(c.id, c.title)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeConversation(c.id)}
                          className="rounded p-1 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer */}
            <footer className="flex items-center gap-3 border-t border-border px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--amber)] text-[color:var(--amber-foreground)]">
                <User className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Washington</div>
                <div className="text-[11px] text-muted-foreground">Architect &amp; Creator</div>
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

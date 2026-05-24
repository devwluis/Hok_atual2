import React, { useEffect, useState, useCallback } from "react";
import { Router as WouterRouter, Switch, Route, useLocation } from "wouter";
import { loadConfig, loadConversations, saveConversations, saveConfig, createConversation, autoTitle, MODELS, apiPing, type HokConfig, type Conversation, type Message } from "@/lib/store";
import { Topbar } from "@/components/Topbar";
import { Sidebar } from "@/components/Sidebar";
import ChatPage from "@/pages/Chat";
import TerminalPage from "@/pages/Terminal";
import SkillsPage from "@/pages/Skills";
import TunnelPage from "@/pages/Tunnel";
import DashboardPage from "@/pages/Dashboard";
import SettingsPage from "@/pages/Settings";

export type View = "dashboard" | "chat" | "terminal" | "skills" | "tunnel" | "config";
export type OnlineStatus = "online" | "offline" | "checking";

export interface AppState {
  view: View;
  setView: (v: View) => void;
  config: HokConfig;
  setConfig: (c: HokConfig) => void;
  status: OnlineStatus;
  checkStatus: () => void;
  model: string;
  setModel: (m: string) => void;
  conversations: Conversation[];
  activeConvId: string | null;
  activeConv: Conversation | null;
  newConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (msg: Message) => void;
  updateLastAssistant: (content: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const [config, setConfigState] = useState<HokConfig>(() => loadConfig());
  const [status, setStatus] = useState<OnlineStatus>("offline");
  const [model, setModel] = useState(MODELS[0].id);
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const view: View = (location.replace("/", "") as View) || "dashboard";
  const setView = (v: View) => setLocation(v === "dashboard" ? "/" : `/${v}`);

  const setConfig = useCallback((c: HokConfig) => {
    saveConfig(c);
    setConfigState(c);
  }, []);

  const checkStatus = useCallback(async () => {
    setStatus("checking");
    try {
      await apiPing(config);
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  }, [config]);

  useEffect(() => { checkStatus(); }, []);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  const newConversation = useCallback(() => {
    const conv = createConversation(model);
    setConversations((prev) => {
      const next = [conv, ...prev];
      saveConversations(next);
      return next;
    });
    setActiveConvId(conv.id);
    if (view !== "chat") setView("chat");
  }, [model, view]);

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    if (view !== "chat") setView("chat");
    setSidebarOpen(false);
  }, [view]);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConversations(next);
      return next;
    });
    if (activeConvId === id) setActiveConvId(null);
  }, [activeConvId]);

  const addMessage = useCallback((msg: Message) => {
    setConversations((prev) => {
      let target = prev.find((c) => c.id === activeConvId);
      if (!target) {
        target = createConversation(model);
        setActiveConvId(target.id);
      }
      const updated = { ...target, messages: [...target.messages, msg] };
      updated.title = autoTitle(updated);
      const next = prev.find((c) => c.id === target!.id)
        ? prev.map((c) => c.id === updated.id ? updated : c)
        : [updated, ...prev];
      saveConversations(next);
      return next;
    });
  }, [activeConvId, model]);

  const updateLastAssistant = useCallback((content: string) => {
    setConversations((prev) => {
      const next = prev.map((conv) => {
        if (conv.id !== activeConvId) return conv;
        const msgs = [...conv.messages];
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "assistant") {
            msgs[i] = { ...msgs[i], content };
            return { ...conv, messages: msgs };
          }
        }
        return conv;
      });
      saveConversations(next);
      return next;
    });
  }, [activeConvId]);

  const appState: AppState = {
    view, setView, config, setConfig, status, checkStatus,
    model, setModel, conversations, activeConvId, activeConv,
    newConversation, selectConversation, deleteConversation,
    addMessage, updateLastAssistant, sidebarOpen, setSidebarOpen,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Topbar state={appState} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar state={appState} />
        <main
          style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
          className="animate-fade-up"
          key={view}
        >
          <Switch>
            <Route path="/" component={() => <DashboardPage state={appState} />} />
            <Route path="/dashboard" component={() => <DashboardPage state={appState} />} />
            <Route path="/chat" component={() => <ChatPage state={appState} />} />
            <Route path="/terminal" component={() => <TerminalPage state={appState} />} />
            <Route path="/skills" component={() => <SkillsPage state={appState} />} />
            <Route path="/tunnel" component={() => <TunnelPage state={appState} />} />
            <Route path="/config" component={() => <SettingsPage state={appState} />} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppContent />
    </WouterRouter>
  );
}

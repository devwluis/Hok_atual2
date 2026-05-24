import React from "react";
import type { AppState } from "@/App";
import { formatDate } from "@/lib/store";

export function Sidebar({ state }: { state: AppState }) {
  const { conversations, activeConvId, selectConversation, deleteConversation, newConversation, sidebarOpen, setSidebarOpen } = state;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside style={{
        width: 220,
        minWidth: 220,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "transform 200ms",
      }}>
        {/* New conversation */}
        <div style={{ padding: "12px 12px 8px" }}>
          <button
            className="hok-btn primary"
            style={{ width: "100%", justifyContent: "center", padding: "7px 12px" }}
            onClick={newConversation}
          >
            <span style={{ fontSize: 14, fontWeight: 300 }}>+</span>
            <span style={{ fontSize: 12 }}>Nova conversa</span>
          </button>
        </div>

        <div style={{ padding: "4px 12px 8px" }}>
          <span className="hok-label">Conversas</span>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
          {conversations.length === 0 && (
            <div style={{ padding: "24px 12px", color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
              Nenhuma conversa ainda
            </div>
          )}
          {conversations.map((conv) => {
            const isActive = conv.id === activeConvId;
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  padding: "8px 10px 8px 8px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  borderLeft: isActive ? `2px solid var(--accent)` : "2px solid transparent",
                  marginBottom: 1,
                  transition: "background 120ms",
                  position: "relative",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: isActive ? 500 : 400,
                  }}>
                    {conv.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDate(conv.date)}</span>
                    <span style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      background: "var(--bg-elevated)",
                      padding: "0 4px",
                      borderRadius: 2,
                    }}>{conv.messages.length}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "0 2px",
                    opacity: 0,
                    transition: "opacity 120ms",
                    lineHeight: 1,
                  }}
                  className="delete-btn"
                  title="Deletar"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <style>{`
          div:hover .delete-btn { opacity: 1 !important; }
        `}</style>
      </aside>
    </>
  );
}

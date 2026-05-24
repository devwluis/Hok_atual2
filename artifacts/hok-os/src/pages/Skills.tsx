import React, { useState } from "react";
import type { AppState } from "@/App";
import { loadSkills, saveSkills, apiShell, type Skill } from "@/lib/store";

export default function SkillsPage({ state }: { state: AppState }) {
  const { config } = state;
  const [skills, setSkillsState] = useState<Skill[]>(() => loadSkills());
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, { out: string; ok: boolean }>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newSkill, setNewSkill] = useState<Omit<Skill, "id">>({
    name: "", description: "", command: "", tags: [], enabled: true,
  });

  const save = (s: Skill[]) => { setSkillsState(s); saveSkills(s); };

  const toggleSkill = (id: string) => {
    save(skills.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSkill = (id: string) => {
    save(skills.filter((s) => s.id !== id));
  };

  const runSkill = async (skill: Skill) => {
    if (running) return;
    setRunning(skill.id);
    try {
      const result = await apiShell(config, skill.command);
      setOutputs((o) => ({ ...o, [skill.id]: { out: result.output.slice(0, 400), ok: result.sucesso } }));
    } catch (err) {
      setOutputs((o) => ({ ...o, [skill.id]: { out: `Erro: ${err instanceof Error ? err.message : "Falha"}`, ok: false } }));
    } finally {
      setRunning(null);
    }
  };

  const addNew = () => {
    if (!newSkill.name || !newSkill.command) return;
    const s: Skill = {
      ...newSkill,
      id: Date.now().toString(36),
      tags: typeof newSkill.tags === "string"
        ? (newSkill.tags as unknown as string).split(",").map((t) => t.trim()).filter(Boolean)
        : newSkill.tags,
    };
    save([...skills, s]);
    setNewSkill({ name: "", description: "", command: "", tags: [], enabled: true });
    setShowNew(false);
  };

  const filtered = skills.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Skills</h1>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Comandos salvos para execução rápida no Termux
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <input
          className="hok-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar skill..."
          style={{ width: 200, padding: "6px 12px" }}
        />
        <button className="hok-btn primary" onClick={() => setShowNew(true)}>
          + Nova skill
        </button>
      </div>

      {/* New skill form */}
      {showNew && (
        <div className="hok-panel" style={{ padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Nova skill</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="hok-input" placeholder="Nome" value={newSkill.name} onChange={(e) => setNewSkill((s) => ({ ...s, name: e.target.value }))} />
            <input className="hok-input" placeholder="Tags (vírgula)" value={Array.isArray(newSkill.tags) ? newSkill.tags.join(", ") : ""} onChange={(e) => setNewSkill((s) => ({ ...s, tags: e.target.value.split(",").map((t) => t.trim()) }))} />
          </div>
          <input className="hok-input" placeholder="Descrição" value={newSkill.description} onChange={(e) => setNewSkill((s) => ({ ...s, description: e.target.value }))} />
          <input className="hok-input" placeholder="Comando" value={newSkill.command} onChange={(e) => setNewSkill((s) => ({ ...s, command: e.target.value }))} style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="hok-btn primary" onClick={addNew}>Salvar</button>
            <button className="hok-btn" onClick={() => setShowNew(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {filtered.map((skill) => {
          const output = outputs[skill.id];
          const isRunning = running === skill.id;
          return (
            <div
              key={skill.id}
              className="hok-panel"
              style={{
                padding: "16px 18px",
                opacity: skill.enabled ? 1 : 0.55,
                borderLeft: skill.enabled ? "2px solid var(--accent)" : "2px solid var(--border)",
                transition: "opacity 200ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{skill.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{skill.description}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="hok-btn ghost" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => toggleSkill(skill.id)}>
                    {skill.enabled ? "desativar" : "ativar"}
                  </button>
                  <button className="hok-btn ghost" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => deleteSkill(skill.id)}>×</button>
                </div>
              </div>

              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--accent)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", marginBottom: 10 }}>
                $ {skill.command}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: output ? 8 : 0 }}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {skill.tags.map((t) => (
                    <span key={t} style={{ fontSize: 10, padding: "1px 6px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 2, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <button
                  className="hok-btn primary"
                  style={{ padding: "4px 12px", fontSize: 11 }}
                  onClick={() => runSkill(skill)}
                  disabled={!!running || !skill.enabled}
                >
                  {isRunning ? "..." : "Executar"}
                </button>
              </div>

              {output && (
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: output.ok ? "var(--text-primary)" : "var(--offline)",
                  background: "var(--bg-elevated)",
                  border: `1px solid ${output.ok ? "var(--border)" : "rgba(252,129,129,0.2)"}`,
                  borderRadius: "var(--radius)",
                  padding: "8px 10px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: 120,
                  overflowY: "auto",
                }}>
                  {output.out || "(sem saída)"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          Nenhuma skill encontrada
        </div>
      )}
    </div>
  );
}

// HOK OS — State & API Layer
// All state persisted in localStorage. No external state lib needed.

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  date: number;
  model: string;
}

export interface HokConfig {
  serverUrl: string;
  token: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  command: string;
  tags: string[];
  enabled: boolean;
}

// ─── Storage Keys ────────────────────────────────────────────────
const CONV_KEY = "hok_conversations";
const CONFIG_KEY = "hok_config";
const SKILLS_KEY = "hok_skills";

// ─── Config ──────────────────────────────────────────────────────
export const DEFAULT_CONFIG: HokConfig = {
  serverUrl: "http://localhost:8081",
  token: "",
};

export function loadConfig(): HokConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { return DEFAULT_CONFIG; }
}

export function saveConfig(c: HokConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
}

// ─── Conversations ────────────────────────────────────────────────
export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch { return []; }
}

export function saveConversations(convs: Conversation[]) {
  localStorage.setItem(CONV_KEY, JSON.stringify(convs));
}

export function createConversation(model: string): Conversation {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: "Nova conversa",
    messages: [],
    date: Date.now(),
    model,
  };
}

export function autoTitle(conv: Conversation): string {
  const first = conv.messages.find((m) => m.role === "user");
  if (!first) return "Nova conversa";
  return first.content.slice(0, 40) + (first.content.length > 40 ? "…" : "");
}

// ─── Skills ──────────────────────────────────────────────────────
export const DEFAULT_SKILLS: Skill[] = [
  { id: "s1", name: "Listar arquivos", description: "Lista pastas e arquivos do dispositivo", command: "ls -la /sdcard", tags: ["file", "android"], enabled: true },
  { id: "s2", name: "Info do sistema", description: "Modelo, versão e hardware do dispositivo", command: "getprop ro.product.model && uname -a", tags: ["system", "android"], enabled: true },
  { id: "s3", name: "Processos ativos", description: "Lista processos em execução no Termux", command: "ps aux | head -20", tags: ["system", "termux"], enabled: false },
  { id: "s4", name: "Uso de disco", description: "Espaço livre e usado no armazenamento", command: "df -h /sdcard", tags: ["file", "storage"], enabled: true },
  { id: "s5", name: "Indexar codebase", description: "Indexa o repositório atual para contexto", command: "/index", tags: ["dev", "ai"], enabled: false },
  { id: "s6", name: "Notificacao Android", description: "Envia notificação push para o dispositivo", command: "/notify", tags: ["android", "ui"], enabled: true },
];

export function loadSkills(): Skill[] {
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    if (!raw) return DEFAULT_SKILLS;
    return JSON.parse(raw) as Skill[];
  } catch { return DEFAULT_SKILLS; }
}

export function saveSkills(skills: Skill[]) {
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
}

// ─── Models ──────────────────────────────────────────────────────
export interface ModelDef {
  id: string;
  label: string;
  badge: string;
  icon: string;
}

export const MODELS: ModelDef[] = [
  { id: "deepseek/deepseek-r1:free",                    label: "R1 Deep",  badge: "free", icon: "⚡" },
  { id: "deepseek/deepseek-chat-v3-0324:free",          label: "Chat v3",  badge: "free", icon: "◈" },
  { id: "google/gemini-2.0-flash-exp:free",             label: "Gemini",   badge: "free", icon: "✦" },
  { id: "meta-llama/llama-4-maverick:free",             label: "Llama 4",  badge: "free", icon: "◉" },
  { id: "deepseek/deepseek-r1-distill-llama-70b:free",  label: "R1 Code",  badge: "free", icon: "⬡" },
  { id: "microsoft/phi-4-reasoning-plus:free",          label: "Phi-4",    badge: "free", icon: "φ" },
  { id: "mistralai/mistral-7b-instruct:free",           label: "Mistral",  badge: "free", icon: "M" },
];

// ─── API Calls ────────────────────────────────────────────────────
function hokHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-HOK-TOKEN": token,
    "ngrok-skip-browser-warning": "true",
  };
}

// Non-streaming fallback (used internally by apiChatStream)
async function apiFetch(
  config: HokConfig,
  messages: { role: string; content: string }[],
  model: string,
): Promise<string> {
  const last = messages[messages.length - 1]?.content ?? "";
  const res = await fetch(`${config.serverUrl.replace(/\/$/, "")}/hok`, {
    method: "POST",
    headers: hokHeaders(config.token),
    body: JSON.stringify({ message: last, model, history: messages.slice(0, -1) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { reply?: string; message?: string };
  return data.reply ?? data.message ?? "(sem resposta)";
}

// ─── SSE streaming chat ───────────────────────────────────────────
// Calls onChunk(token) for each streamed token, onDone() when finished.
// Falls back to non-streaming JSON if the server doesn't send SSE.
// The AbortController signal can be used to cancel mid-stream.
export async function apiChatStream(
  config: HokConfig,
  messages: { role: string; content: string }[],
  model: string,
  onChunk: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const last = messages[messages.length - 1]?.content ?? "";
  const base = config.serverUrl.replace(/\/$/, "");

  let res: Response;
  try {
    res = await fetch(`${base}/hok`, {
      method: "POST",
      headers: { ...hokHeaders(config.token), Accept: "text/event-stream" },
      body: JSON.stringify({
        message: last,
        model,
        history: messages.slice(0, -1),
        stream: true,
      }),
      signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    onError(err instanceof Error ? err.message : "Erro de rede");
    return;
  }

  if (!res.ok) {
    onError(`HTTP ${res.status}`);
    return;
  }

  const contentType = res.headers.get("content-type") ?? "";

  // ── SSE path ────────────────────────────────────────────────────
  if (contentType.includes("text/event-stream") || contentType.includes("octet-stream")) {
    const reader = res.body?.getReader();
    if (!reader) { onError("ReadableStream não suportado"); return; }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal?.aborted) { reader.cancel(); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue; // SSE comments

          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") { onDone(); return; }
            try {
              const json = JSON.parse(data) as {
                choices?: { delta?: { content?: string }; finish_reason?: string }[];
                reply?: string;
                token?: string;
              };
              // OpenAI-compatible delta format
              const token =
                json.choices?.[0]?.delta?.content ??
                json.reply ??
                json.token ??
                "";
              if (token) onChunk(token);
              if (json.choices?.[0]?.finish_reason === "stop") { onDone(); return; }
            } catch {
              // Non-JSON line — treat as raw token
              if (data) onChunk(data);
            }
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        onError(err instanceof Error ? err.message : "Erro no stream");
        return;
      }
    }
    onDone();
    return;
  }

  // ── JSON fallback ────────────────────────────────────────────────
  try {
    const data = await res.json() as { reply?: string; message?: string };
    const reply = data.reply ?? data.message ?? "(sem resposta)";
    // Simulate token-by-token for a smooth feel even without real SSE
    const words = reply.split(/(?<=\s)/);
    for (const word of words) {
      if (signal?.aborted) break;
      onChunk(word);
      await new Promise<void>((r) => setTimeout(r, 18));
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Erro ao parsear resposta");
  }
}

// Keep the old non-streaming export for any other callers
export async function apiChat(
  config: HokConfig,
  messages: { role: string; content: string }[],
  model: string,
): Promise<string> {
  return apiFetch(config, messages, model);
}

export async function apiPing(config: HokConfig): Promise<{ status: string; version?: string; uptime?: number }> {
  const res = await fetch(`${config.serverUrl.replace(/\/$/, "")}/ping`, {
    method: "GET",
    headers: hokHeaders(config.token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ status: string; version?: string; uptime?: number }>;
}

export async function apiShell(config: HokConfig, cmd: string): Promise<{ output: string; sucesso: boolean }> {
  const res = await fetch(`${config.serverUrl.replace(/\/$/, "")}/shell`, {
    method: "POST",
    headers: hokHeaders(config.token),
    body: JSON.stringify({ cmd }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ output: string; sucesso: boolean }>;
}

// ─── Utils ───────────────────────────────────────────────────────
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function uuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

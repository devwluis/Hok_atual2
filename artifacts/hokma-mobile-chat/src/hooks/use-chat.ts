import { useCallback, useEffect, useState } from "react";

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: "text" | "image" | "binary";
  content?: string;
  dataUrl?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: Attachment[];
  routedVia?: "hok" | "openrouter" | "hokclaw" | "preview";
};

export type Agent = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  color: string;
};

export type ModelOption = {
  id: string;
  label: string;
  provider: string;
  description: string;
};

export type EngineMode = "hokclaw" | "preview";

export type EngineConfig = {
  mode: EngineMode;
  endpoint: string;
  model: string;
  apiKey: string;
};

export type HokConfig = {
  hokUrl: string;
  hokToken: string;
  openrouterKey: string;
};

export type ConnectionStatus = "idle" | "online" | "offline" | "testing";

const STORE_KEY = "hokma_mobile_engine_config";
const MESSAGES_STORE_KEY = "hokma_mobile_messages";
const HOK_CONFIG_KEY = "hokma_hok_config";
const PHONE_IP_ENDPOINT = "http://10.168.212.48:18800/v1/chat/completions";

const DEFAULT_HOK_CONFIG: HokConfig = {
  hokUrl: "http://bore.pub:35798/hok",
  hokToken: "W@sh1ngt0nJarvis2026#",
  openrouterKey: "",
};

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", provider: "Groq/HokClaw", description: "Rapido para chat local" },
  { id: "gemini-1.5-flash", label: "Gemini Flash", provider: "Google", description: "Rapido e multimodal" },
  { id: "gemini-1.5-pro", label: "Gemini Pro", provider: "Google", description: "Raciocinio mais forte" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI", description: "Geral e economico" },
  { id: "gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI", description: "Baixa latencia" },
  { id: "qwen/qwen3-coder:free", label: "Qwen Coder Free", provider: "OpenRouter", description: "Codigo e agentes" },
  { id: "anthropic/claude-3-haiku", label: "Claude Haiku", provider: "Anthropic", description: "Analise objetiva" },
];

const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  mode: "hokclaw",
  endpoint: PHONE_IP_ENDPOINT,
  model: "llama-3.1-8b-instant",
  apiKey: "",
};

export const AGENTS: Agent[] = [
  { id: "openclaw", name: "OpenClaw", shortName: "Core", icon: "Dna", description: "Executor central, comandos naturais e orquestracao", color: "text-cyan-500" },
  { id: "coder", name: "Coder", shortName: "Code", icon: "Code2", description: "Programacao, scripts, leitura de arquivos e debug", color: "text-blue-500" },
  { id: "devops", name: "DevOps", shortName: "Ops", icon: "ServerCog", description: "Termux, servidores, rede, deploy e automacao", color: "text-emerald-500" },
  { id: "architect", name: "Architect", shortName: "Plan", icon: "Network", description: "Arquitetura, produto e sistemas complexos", color: "text-violet-500" },
  { id: "analyst", name: "Analyst", shortName: "Data", icon: "ScanSearch", description: "Pesquisa, analise de contexto e documentos", color: "text-amber-500" },
];

function loadEngineConfig(): EngineConfig {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_ENGINE_CONFIG;
    const parsed = { ...DEFAULT_ENGINE_CONFIG, ...JSON.parse(raw) };
    if (parsed.endpoint.includes("localhost:18800")) {
      return { ...parsed, endpoint: PHONE_IP_ENDPOINT };
    }
    return parsed;
  } catch {
    return DEFAULT_ENGINE_CONFIG;
  }
}

function saveEngineConfig(config: EngineConfig) {
  localStorage.setItem(STORE_KEY, JSON.stringify(config));
}

function loadHokConfig(): HokConfig {
  try {
    const raw = localStorage.getItem(HOK_CONFIG_KEY);
    if (!raw) return DEFAULT_HOK_CONFIG;
    return { ...DEFAULT_HOK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_HOK_CONFIG;
  }
}

function saveHokConfig(config: HokConfig) {
  localStorage.setItem(HOK_CONFIG_KEY, JSON.stringify(config));
}

function normalizeChatEndpoint(endpoint: string) {
  const cleaned = endpoint.trim().replace(/\/$/, "");
  if (!cleaned) return DEFAULT_ENGINE_CONFIG.endpoint;
  if (cleaned.endsWith("/v1/chat/completions")) return cleaned;
  return `${cleaned}/v1/chat/completions`;
}

function getSystemPrompt(agent: Agent) {
  const base = "Voce e o HokClaw AI Agent, um assistente conectado ao conceito OpenClaw/Hokma. Detecte o idioma do usuario e responda no mesmo idioma, com prioridade para portugues brasileiro quando houver duvida. Seja direto, moderno, util e seguro. Interprete arquivos anexados quando houver contexto textual. Antes de executar qualquer acao sensivel em dispositivo, explique permissao, risco e proximo passo.";
  if (agent.id === "coder") return `${base} Atue como engenheiro de software senior. Leia trechos de arquivos, proponha alteracoes e explique comandos de forma pratica.`;
  if (agent.id === "devops") return `${base} Atue como especialista em Termux, Linux, rede, servidores locais, ngrok, CORS, logs e automacoes.`;
  if (agent.id === "architect") return `${base} Atue como arquiteto de produto e sistemas. Transforme ideias em planos tecnicos claros e evolutivos.`;
  if (agent.id === "analyst") return `${base} Atue como analista. Resuma, compare, extraia requisitos e organize informacoes de anexos e conversas.`;
  return base;
}

function getConnectionErrorMessage(error: unknown, endpoint: string) {
  const rawMessage = error instanceof Error ? error.message : "Erro desconhecido";
  if (rawMessage === "Failed to fetch" || rawMessage === "NetworkError when attempting to fetch resource.") {
    return `O navegador nao conseguiu acessar ${endpoint}. Confira se o celular e esta previa estao na mesma rede, se o servidor HokClaw esta ligado na porta 18800 e se ele permite CORS para chamadas do Chrome.`;
  }
  return rawMessage;
}

function formatAttachmentsForPrompt(attachments: Attachment[]) {
  if (!attachments.length) return "";
  return attachments.map((attachment, index) => {
    const header = `[Arquivo ${index + 1}: ${attachment.name} | ${attachment.type || "tipo desconhecido"} | ${Math.round(attachment.size / 1024)} KB]`;
    if (attachment.kind === "text" && attachment.content) {
      return `${header}\n${attachment.content.slice(0, 60000)}`;
    }
    if (attachment.kind === "image") {
      return `${header}\nImagem anexada para referencia visual. Se o modelo atual nao tiver visao, peca ao usuario uma descricao ou use metadados disponiveis.`;
    }
    return `${header}\nArquivo binario anexado como referencia. Solicite extracao ou conversao caso precise ler o conteudo interno.`;
  }).join("\n\n---\n\n");
}

async function streamPreviewResponse(
  text: string,
  messageId: string,
  updateMessage: (messageId: string, content: string) => void,
) {
  let currentText = "";
  for (let i = 0; i < text.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 7 + Math.random() * 14));
    currentText += text[i];
    updateMessage(messageId, currentText);
  }
}

// HOK Tunnel: texto → bore.pub orquestrador → DeepSeek
async function enviarComandoAoHok(promptTexto: string, config: HokConfig): Promise<string> {
  const url = config.hokUrl.trim() || DEFAULT_HOK_CONFIG.hokUrl;
  const token = config.hokToken.trim() || DEFAULT_HOK_CONFIG.hokToken;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-HOK-TOKEN": token,
    },
    body: JSON.stringify({ message: promptTexto }),
  });
  if (!response.ok) {
    throw new Error(`HOK Tunnel retornou HTTP ${response.status}`);
  }
  const data = await response.json() as { reply?: string };
  return data.reply ?? "O orquestrador HOK respondeu sem conteudo.";
}

// OpenRouter Vision: imagem → GPT-4o-mini
async function analisarImagemOpenRouter(
  prompt: string,
  imageDataUrl: string,
  agent: Agent,
  openrouterKey: string,
): Promise<string> {
  const base64 = imageDataUrl.split(",")[1] ?? imageDataUrl;
  const mimeMatch = imageDataUrl.match(/^data:(image\/[^;]+);base64,/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";

  const systemPrompt = `Voce e o cerebro visual do ecossistema HOK. Analise a imagem de interface/codigo/diagrama enviada pelo celular e responda de forma estruturada em portugues. Agente ativo: ${agent.name} — ${agent.description}.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openrouterKey}`,
      "HTTP-Referer": "https://hokma.app",
      "X-Title": "HokClaw AI Agent",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: prompt || "Analise esta imagem e descreva o que voce ve." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      temperature: 0.5,
      max_tokens: 1800,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${response.status}${err ? `: ${err.slice(0, 160)}` : ""}`);
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "OpenRouter respondeu sem conteudo.";
}

function createWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    content: "HokClaw AI Agent online. Escolha um agente, selecione o modelo, anexe arquivos se precisar e envie seu comando.",
    timestamp: new Date(),
  };
}

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_STORE_KEY);
    if (!raw) return [createWelcomeMessage()];
    const parsed = JSON.parse(raw) as Message[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [createWelcomeMessage()];
    return parsed.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
      isStreaming: false,
    }));
  } catch {
    return [createWelcomeMessage()];
  }
}

function saveMessages(messages: Message[]) {
  const safeMessages = messages
    .filter((message) => !message.isStreaming)
    .slice(-120)
    .map((message) => ({
      ...message,
      attachments: message.attachments?.map((attachment) => ({
        ...attachment,
        content: attachment.content?.slice(0, 60000),
        dataUrl: attachment.dataUrl?.slice(0, 200000),
      })),
    }));
  localStorage.setItem(MESSAGES_STORE_KEY, JSON.stringify(safeMessages));
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0]);
  const [engineConfig, setEngineConfigState] = useState<EngineConfig>(() => loadEngineConfig());
  const [hokConfig, setHokConfigState] = useState<HokConfig>(() => loadHokConfig());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");
  const [hokTunnelStatus, setHokTunnelStatus] = useState<ConnectionStatus>("idle");
  const [openrouterStatus, setOpenrouterStatus] = useState<ConnectionStatus>("idle");

  const updateAssistantMessage = useCallback((messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content }
          : msg,
      ),
    );
  }, []);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const setEngineConfig = useCallback((config: EngineConfig) => {
    const normalized = {
      ...config,
      endpoint: normalizeChatEndpoint(config.endpoint),
      model: config.model.trim() || DEFAULT_ENGINE_CONFIG.model,
    };
    saveEngineConfig(normalized);
    setEngineConfigState(normalized);
    setConnectionStatus("idle");
    setConnectionError("");
  }, []);

  const setHokConfig = useCallback((config: HokConfig) => {
    saveHokConfig(config);
    setHokConfigState(config);
    setHokTunnelStatus("idle");
    setOpenrouterStatus(config.openrouterKey.trim() ? "idle" : "offline");
  }, []);

  const testHokTunnel = useCallback(async (config: HokConfig) => {
    setHokTunnelStatus("testing");
    try {
      const reply = await enviarComandoAoHok("ping", config);
      setHokTunnelStatus(reply ? "online" : "offline");
      return !!reply;
    } catch {
      setHokTunnelStatus("offline");
      return false;
    }
  }, []);

  const validateOpenrouterKey = useCallback((config: HokConfig) => {
    if (config.openrouterKey.trim().length > 10) {
      setOpenrouterStatus("online");
    } else {
      setOpenrouterStatus("offline");
    }
  }, []);

  const sendMessage = useCallback(async (content: string, attachments: Attachment[] = []) => {
    if (!content.trim() && attachments.length === 0) return;

    const userMsgId = Math.random().toString(36).substring(7);
    const attachmentContext = formatAttachmentsForPrompt(attachments);
    const messageContent = content.trim() || "Analise os arquivos anexados.";
    const promptContent = attachmentContext ? `${messageContent}\n\nContexto dos anexos:\n${attachmentContext}` : messageContent;

    const newMsg: Message = {
      id: userMsgId,
      role: "user",
      content: messageContent,
      timestamp: new Date(),
      attachments,
    };

    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsStreaming(true);

    const astMsgId = Math.random().toString(36).substring(7);
    setMessages(prev => [
      ...prev,
      {
        id: astMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      }
    ]);

    try {
      const imageAttachments = attachments.filter((a) => a.kind === "image" && a.dataUrl);
      const hokUrlConfigured = hokConfig.hokUrl.trim().length > 0;

      // ROTA A: imagem presente + chave OpenRouter configurada → visão GPT-4o-mini
      if (imageAttachments.length > 0 && hokConfig.openrouterKey.trim()) {
        setOpenrouterStatus("testing");
        const firstImage = imageAttachments[0];
        const reply = await analisarImagemOpenRouter(
          messageContent,
          firstImage.dataUrl!,
          activeAgent,
          hokConfig.openrouterKey.trim(),
        );
        setOpenrouterStatus("online");
        setMessages(prev => prev.map(msg =>
          msg.id === astMsgId ? { ...msg, routedVia: "openrouter" } : msg
        ));
        updateAssistantMessage(astMsgId, reply);
      }
      // ROTA B: texto puro + túnel HOK configurado → bore.pub orquestrador
      else if (!imageAttachments.length && hokUrlConfigured && engineConfig.mode !== "preview") {
        setHokTunnelStatus("testing");
        const reply = await enviarComandoAoHok(promptContent, hokConfig);
        setHokTunnelStatus("online");
        setMessages(prev => prev.map(msg =>
          msg.id === astMsgId ? { ...msg, routedVia: "hok" } : msg
        ));
        updateAssistantMessage(astMsgId, reply);
      }
      // ROTA C: modo previa simulado
      else if (engineConfig.mode === "preview") {
        const filesLine = attachments.length
          ? `\n\nArquivos recebidos: ${attachments.map((f) => f.name).join(", ")}. Imagens e textos serao tratados conforme o cerebro ativo.`
          : "";
        const responseText = `Agente ${activeAgent.name} usando ${engineConfig.model}.\n\nComando recebido: "${messageContent}".${filesLine}\n\nResposta em modo previa: fluxo pronto para usar HOK Tunnel, OpenRouter Visao ou HokClaw local como cerebro.`;
        await streamPreviewResponse(responseText, astMsgId, updateAssistantMessage);
        setMessages(prev => prev.map(msg =>
          msg.id === astMsgId ? { ...msg, routedVia: "preview" } : msg
        ));
      }
      // ROTA D: HokClaw local direto (OpenAI-compatible)
      else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (engineConfig.apiKey.trim()) {
          headers.Authorization = `Bearer ${engineConfig.apiKey.trim()}`;
        }

        const history = messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .filter((message) => !message.isStreaming && message.id !== "welcome")
          .slice(-40)
          .map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.attachments?.length
              ? `${message.content}\n\nContexto dos anexos:\n${formatAttachmentsForPrompt(message.attachments)}`
              : message.content,
          }));

        const endpoint = normalizeChatEndpoint(engineConfig.endpoint);
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: engineConfig.model,
            messages: [
              { role: "system", content: getSystemPrompt(activeAgent) },
              ...history,
              { role: "user", content: promptContent },
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 1800,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`HTTP ${response.status}${errorText ? `: ${errorText.slice(0, 180)}` : ""}`);
        }

        setConnectionError("");
        setConnectionStatus("online");

        const contentType = response.headers.get("content-type") || "";
        if (!response.body || !contentType.includes("text/event-stream")) {
          const data = await response.json() as { choices?: { message?: { content?: string } }[]; message?: string; content?: string };
          const reply = data.choices?.[0]?.message?.content || data.message || data.content || JSON.stringify(data);
          updateAssistantMessage(astMsgId, reply);
        } else {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]" || !trimmed.startsWith("data:")) continue;

              try {
                const parsed = JSON.parse(trimmed.replace(/^data:\s*/, "")) as {
                  choices?: { delta?: { content?: string }; message?: { content?: string } }[];
                };
                const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
                if (delta) {
                  accumulated += delta;
                  updateAssistantMessage(astMsgId, accumulated);
                }
              } catch {
                continue;
              }
            }
          }

          if (!accumulated) {
            updateAssistantMessage(astMsgId, "O motor respondeu sem conteudo. Verifique o modelo ou o servidor HokClaw.");
          }
        }

        setMessages(prev => prev.map(msg =>
          msg.id === astMsgId ? { ...msg, routedVia: "hokclaw" } : msg
        ));
      }
    } catch (error) {
      const isHokRoute = hokConfig.hokUrl.trim().length > 0 && attachments.filter((a) => a.kind === "image").length === 0;
      if (isHokRoute) {
        setHokTunnelStatus("offline");
      } else {
        setConnectionStatus("offline");
      }
      const endpoint = normalizeChatEndpoint(engineConfig.endpoint);
      const message = getConnectionErrorMessage(error, endpoint);
      setConnectionError(message);
      updateAssistantMessage(
        astMsgId,
        `Nao consegui conectar ao motor configurado.\n\nDetalhe: ${message}\n\nVerifique se o HOK Orquestrador esta ativo no Termux e se a URL do tunel esta correta nas configuracoes.`,
      );
    } finally {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === astMsgId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

      setIsStreaming(false);
    }
  }, [activeAgent, engineConfig, hokConfig, messages, updateAssistantMessage]);

  const testConnection = useCallback(async (overrideConfig?: EngineConfig) => {
    const config = overrideConfig ? {
      ...overrideConfig,
      endpoint: normalizeChatEndpoint(overrideConfig.endpoint),
      model: overrideConfig.model.trim() || DEFAULT_ENGINE_CONFIG.model,
    } : engineConfig;

    if (config.mode === "preview") {
      setConnectionStatus("online");
      setConnectionError("");
      return true;
    }

    setConnectionStatus("testing");
    setConnectionError("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (config.apiKey.trim()) {
        headers.Authorization = `Bearer ${config.apiKey.trim()}`;
      }

      const response = await fetch(normalizeChatEndpoint(config.endpoint), {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: "Responda apenas OK" }],
          stream: false,
          max_tokens: 8,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setConnectionStatus("online");
      setConnectionError("");
      return true;
    } catch (error) {
      setConnectionStatus("offline");
      setConnectionError(getConnectionErrorMessage(error, normalizeChatEndpoint(config.endpoint)));
      return false;
    }
  }, [engineConfig]);

  const clearChat = useCallback(() => {
    localStorage.removeItem(MESSAGES_STORE_KEY);
    setMessages([{
      id: "cleared",
      role: "system",
      content: "Memoria da sessao limpa. Novo contexto iniciado.",
      timestamp: new Date(),
    }]);
  }, []);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    activeAgent,
    setActiveAgent,
    engineConfig,
    setEngineConfig,
    hokConfig,
    setHokConfig,
    connectionStatus,
    connectionError,
    hokTunnelStatus,
    openrouterStatus,
    testConnection,
    testHokTunnel,
    validateOpenrouterKey,
    sendMessage,
    clearChat,
  };
}

import { useCallback, useState } from "react";

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

export type ConnectionStatus = "idle" | "online" | "offline" | "testing";

const STORE_KEY = "hokma_mobile_engine_config";
const PHONE_IP_ENDPOINT = "http://10.168.212.48:18800/v1/chat/completions";

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

function normalizeChatEndpoint(endpoint: string) {
  const cleaned = endpoint.trim().replace(/\/$/, "");
  if (!cleaned) return DEFAULT_ENGINE_CONFIG.endpoint;
  if (cleaned.endsWith("/v1/chat/completions")) return cleaned;
  return `${cleaned}/v1/chat/completions`;
}

function getSystemPrompt(agent: Agent) {
  const base = "Voce e o HokClaw AI Agent, um assistente em portugues brasileiro conectado ao conceito OpenClaw/Hokma. Seja direto, moderno, util e seguro. Interprete arquivos anexados quando houver contexto textual. Antes de executar qualquer acao sensivel em dispositivo, explique permissao, risco e proximo passo.";
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

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "HokClaw AI Agent online. Escolha um agente, selecione o modelo, anexe arquivos se precisar e envie seu comando.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0]);
  const [engineConfig, setEngineConfigState] = useState<EngineConfig>(() => loadEngineConfig());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");

  const updateAssistantMessage = useCallback((messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content }
          : msg,
      ),
    );
  }, []);

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
      if (engineConfig.mode === "preview") {
        const filesLine = attachments.length ? `\n\nArquivos recebidos: ${attachments.map((file) => file.name).join(", ")}. Vou tratar textos como contexto e imagens/binarios como referencias ate o servidor de visao estar ativo.` : "";
        const responseText = `Agente ${activeAgent.name} usando ${engineConfig.model}.\n\nComando recebido: "${messageContent}".${filesLine}\n\nResposta em modo previa: o fluxo esta pronto para usar HokClaw como cerebro, alternar modelos gratuitos e interpretar anexos quando o backend expuser essa capacidade.`;
        await streamPreviewResponse(responseText, astMsgId, updateAssistantMessage);
      } else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (engineConfig.apiKey.trim()) {
          headers.Authorization = `Bearer ${engineConfig.apiKey.trim()}`;
        }

        const history = messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .filter((message) => !message.isStreaming && message.id !== "welcome")
          .slice(-10)
          .map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.attachments?.length ? `${message.content}\n\nContexto dos anexos:\n${formatAttachmentsForPrompt(message.attachments)}` : message.content,
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
          const data = await response.json();
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
                const parsed = JSON.parse(trimmed.replace(/^data:\s*/, ""));
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
      }
    } catch (error) {
      setConnectionStatus("offline");
      const endpoint = normalizeChatEndpoint(engineConfig.endpoint);
      const message = getConnectionErrorMessage(error, endpoint);
      setConnectionError(message);
      updateAssistantMessage(
        astMsgId,
        `Nao consegui conectar ao motor configurado.\n\nEndpoint: ${endpoint}\nModelo: ${engineConfig.model}\n\nDetalhe: ${message}\n\nSe continuar falhando, confirme se o HokClaw esta ouvindo em 0.0.0.0:18800 e com CORS liberado para o Chrome.`,
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
  }, [activeAgent, engineConfig, messages, updateAssistantMessage]);

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
    sendMessage,
    activeAgent,
    setActiveAgent,
    clearChat,
    engineConfig,
    setEngineConfig,
    connectionStatus,
    connectionError,
    testConnection,
  };
}

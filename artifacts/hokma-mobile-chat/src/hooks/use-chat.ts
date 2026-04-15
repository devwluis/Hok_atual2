import { useCallback, useState } from "react";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
};

export type Agent = {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
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

const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  mode: "hokclaw",
  endpoint: PHONE_IP_ENDPOINT,
  model: "llama-3.1-8b-instant",
  apiKey: "",
};

export const AGENTS: Agent[] = [
  { id: "hokma-core", name: "Hokma Core", icon: "BrainCircuit", description: "Raciocinio geral e comandos naturais", color: "text-primary" },
  { id: "coder", name: "Codigo", icon: "Code2", description: "Programacao, scripts e analise tecnica", color: "text-blue-500" },
  { id: "automation", name: "Automacao", icon: "Workflow", description: "Fluxos para PC, celular e APIs", color: "text-emerald-500" },
  { id: "vision", name: "Visao", icon: "Eye", description: "Imagem, tela e contexto visual", color: "text-purple-500" },
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
  const base = "Voce e Hokma AI, um assistente em portugues brasileiro para chat, codigo, automacao e controle seguro de dispositivos.";
  if (agent.id === "coder") return `${base} Atue como engenheiro de software senior, direto e pratico.`;
  if (agent.id === "automation") return `${base} Atue como orquestrador de automacoes. Sempre explique permissoes e riscos antes de executar algo sensivel.`;
  if (agent.id === "vision") return `${base} Atue como modulo de visao e contexto visual. Quando nao houver imagem, peca o contexto necessario.`;
  return base;
}

function getConnectionErrorMessage(error: unknown, endpoint: string) {
  const rawMessage = error instanceof Error ? error.message : "Erro desconhecido";
  if (rawMessage === "Failed to fetch" || rawMessage === "NetworkError when attempting to fetch resource.") {
    return `O navegador nao conseguiu acessar ${endpoint}. Confira se o celular e esta previa estao na mesma rede, se o servidor HokClaw esta ligado na porta 18800 e se ele permite CORS para chamadas do Chrome.`;
  }
  return rawMessage;
}

async function streamPreviewResponse(
  text: string,
  messageId: string,
  updateMessage: (messageId: string, content: string) => void,
) {
  let currentText = "";
  for (let i = 0; i < text.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 18));
    currentText += text[i];
    updateMessage(messageId, currentText);
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hokma inicializado. Previa local pronta para testar comandos, agentes e fluxo mobile.",
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
  
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    const userMsgId = Math.random().toString(36).substring(7);
    const newMsg: Message = {
      id: userMsgId,
      role: "user",
      content,
      timestamp: new Date(),
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
        const responseText = `Processando pelo agente ${activeAgent.name}.\n\nComando recebido: "${content}".\n\nResultado em modo previa: analise concluida, plano de acao preparado e execucao simulada com seguranca. Para usar seu servidor do celular, altere o motor para HokClaw Local.`;
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
            content: message.content,
          }));

        const response = await fetch(normalizeChatEndpoint(engineConfig.endpoint), {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: engineConfig.model,
            messages: [
              { role: "system", content: getSystemPrompt(activeAgent) },
              ...history,
              { role: "user", content },
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 1600,
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
        `Nao consegui conectar ao motor configurado.\n\nEndpoint: ${endpoint}\nModelo: ${engineConfig.model}\n\nDetalhe: ${message}\n\nNo seu caso, use este endpoint: ${PHONE_IP_ENDPOINT}. Se ainda falhar, o servidor HokClaw precisa liberar CORS para chamadas do Chrome.`,
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
      content: "Memoria da sessao limpa. Previa reiniciada.",
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
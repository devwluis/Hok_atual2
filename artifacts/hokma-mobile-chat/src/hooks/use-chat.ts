import React, { useState, useEffect, useRef, useCallback } from "react";

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

export const AGENTS: Agent[] = [
  { id: "hokma-core", name: "Hokma Core", icon: "BrainCircuit", description: "Raciocinio geral e comandos naturais", color: "text-primary" },
  { id: "coder", name: "Codigo", icon: "Code2", description: "Programacao, scripts e analise tecnica", color: "text-blue-500" },
  { id: "automation", name: "Automacao", icon: "Workflow", description: "Fluxos para PC, celular e APIs", color: "text-emerald-500" },
  { id: "vision", name: "Visao", icon: "Eye", description: "Imagem, tela e contexto visual", color: "text-purple-500" },
];

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
    
    // Simulate streaming response
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
    
    // Fake typing effect
    const responseText = `Processando pelo agente ${activeAgent.name}.\n\nComando recebido: "${content}".\n\nResultado em modo previa: analise concluida, plano de acao preparado e execucao simulada com seguranca. Na proxima etapa este fluxo pode ser conectado ao motor real do HokClaw, permissoes do dispositivo e automacoes locais.`;
    let currentText = "";
    
    for (let i = 0; i < responseText.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 30));
      currentText += responseText[i];
      setMessages(prev => 
        prev.map(msg => 
          msg.id === astMsgId 
            ? { ...msg, content: currentText } 
            : msg
        )
      );
    }
    
    setMessages(prev => 
      prev.map(msg => 
        msg.id === astMsgId 
          ? { ...msg, isStreaming: false } 
          : msg
      )
    );
    
    setIsStreaming(false);
  }, [activeAgent]);

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
  };
}
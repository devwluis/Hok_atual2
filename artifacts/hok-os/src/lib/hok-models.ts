// AI models available in the HOK backend
// Source: HOK OS Backend context document

export type HokModel = {
  id: string;           // sent in "model" field to backend
  label: string;        // display name
  provider: string;     // provider tag
  color: string;        // accent color
  emoji: string;
  description: string;
};

export const HOK_MODELS: HokModel[] = [
  {
    id: "auto",
    label: "Auto",
    provider: "HOK",
    color: "#F5A623",
    emoji: "🧠",
    description: "HOK decide o melhor modelo",
  },
  {
    id: "nousresearch/hermes-4-70b",
    label: "Hermes 4",
    provider: "OpenRouter",
    color: "#8b5cf6",
    emoji: "⚗️",
    description: "Hermes-4 70B via OpenRouter — modelo default",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    provider: "Cerebras",
    color: "#ef4444",
    emoji: "⚡",
    description: "Ultra-rápido — 1º da cascata de fallback",
  },
  {
    id: "groq",
    label: "Groq",
    provider: "Groq",
    color: "#22c55e",
    emoji: "🚀",
    description: "Groq Llama 3.3 70B — 2º da cascata",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini Flash",
    provider: "Google",
    color: "#3b82f6",
    emoji: "✨",
    description: "Gemini 2.5 Flash — motor do Hermes Agent",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini Lite",
    provider: "Google",
    color: "#60a5fa",
    emoji: "💡",
    description: "Gemini Flash Lite — leve e rápido",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    provider: "DeepSeek",
    color: "#06b6d4",
    emoji: "🔬",
    description: "DeepSeek — reserva configurável",
  },
];

export function getModel(id: string): HokModel {
  return HOK_MODELS.find((m) => m.id === id) ?? HOK_MODELS[0];
}

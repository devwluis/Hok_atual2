import { HOK_MODELS, type HokModel } from "@/lib/hok-models";

export type ApiModel = {
  id: string;
  name: string;
  provider: string;
  description?: string;
};

export type ChatModel = HokModel & {
  source: "api" | "fallback";
};

type ModelsResponse = { models?: ApiModel[] };

const CACHE_TTL = 60 * 60 * 1000;
let cachedModels: ApiModel[] | null = null;
let cachedAt = 0;

export const FALLBACK_MODELS: ChatModel[] = HOK_MODELS.map((model) => ({
  ...model,
  label: model.id === "auto" ? "Automático" : model.label,
  source: "fallback",
}));

export function toChatModel(model: ApiModel): ChatModel {
  const fallback = HOK_MODELS.find((item) => item.id === model.id);
  return {
    id: model.id,
    label: model.name,
    provider: model.provider || "Outro",
    color: fallback?.color ?? "var(--amber)",
    description: model.description || fallback?.description || "Modelo disponível no HOK OS",
    source: "api",
  };
}

export async function fetchModelCatalog(force = false): Promise<ChatModel[]> {
  if (!force && cachedModels && Date.now() - cachedAt < CACHE_TTL) {
    return cachedModels.map(toChatModel);
  }

  const response = await fetch("/api/models", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Não foi possível carregar os modelos (${response.status})`);

  const payload = (await response.json()) as ModelsResponse;
  if (!Array.isArray(payload.models) || payload.models.length === 0) {
    throw new Error("A lista de modelos retornou vazia");
  }

  cachedModels = payload.models.filter(
    (model): model is ApiModel =>
      Boolean(model && typeof model.id === "string" && typeof model.name === "string"),
  );
  cachedAt = Date.now();
  return cachedModels.map(toChatModel);
}
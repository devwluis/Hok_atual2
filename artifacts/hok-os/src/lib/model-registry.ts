import { HOK_MODELS, type HokModel } from "@/lib/hok-models";

export type ApiModel = {
  id: string;
  name: string;
  provider: string;
  description?: string;
  free?: boolean;
};

export type ChatModel = HokModel & {
  source: "api" | "fallback";
  free?: boolean;
};

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
    free: model.free,
    source: "api",
  };
}

type CatalogModel = ApiModel & { label?: string };
type CatalogProvider = { provider: string; models?: CatalogModel[] };
type CatalogResponse = { status?: string; providers?: CatalogProvider[] };

const SETTINGS_KEY = "hokma.settings.v1";

function readHokToken(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return "";
    const s = JSON.parse(raw) as Record<string, string>;
    return s["HOK_TOKEN"] || "";
  } catch {
    return "";
  }
}

export async function fetchModelCatalog(force = false): Promise<ChatModel[]> {
  if (!force && cachedModels && Date.now() - cachedAt < CACHE_TTL) {
    return cachedModels.map(toChatModel);
  }

  const token = readHokToken();
  if (!token) {
    throw new Error("Configure o HOK_TOKEN nas Configurações para carregar o catálogo");
  }

  const response = await fetch("/models/catalog", {
    method: "GET",
    headers: { Accept: "application/json", "X-Hok-Token": token },
  });
  if (!response.ok) throw new Error(`Não foi possível carregar os modelos (${response.status})`);

  const payload = (await response.json()) as CatalogResponse;
  const models: ApiModel[] = (payload.providers ?? []).flatMap((p) =>
    (p.models ?? []).map((model) => ({
      id: model.id,
      name: model.name || model.label || model.id,
      provider: model.provider || p.provider,
      description: model.description,
      free: model.free,
    })),
  );

  if (models.length === 0) {
    throw new Error("A lista de modelos retornou vazia");
  }

  cachedModels = models.filter(
    (model): model is ApiModel => Boolean(model && typeof model.id === "string" && typeof model.name === "string"),
  );
  cachedAt = Date.now();
  return cachedModels.map(toChatModel);
}
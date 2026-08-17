import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const MODELS_DEV_URL = "https://models.dev/api.json";
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;

export type PublicModel = {
  id: string;
  name: string;
  provider: string;
  description?: string;
};

type ModelsDevModel = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
};

type ModelsDevProvider = {
  name?: unknown;
  models?: Record<string, ModelsDevModel>;
};

const FALLBACK_MODELS: PublicModel[] = [
  {
    id: "auto",
    name: "Automático",
    provider: "HOK",
    description: "HOK escolhe o modelo ideal para cada tarefa",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "Groq",
    description: "Resposta rápida para conversas e desenvolvimento",
  },
  {
    id: "nousresearch/hermes-4-70b",
    name: "Hermes 4 70B",
    provider: "OpenRouter",
    description: "Raciocínio e código complexo",
  },
];

let cachedModels: PublicModel[] | null = null;
let cachedAt = 0;

function normalizeModels(payload: unknown): PublicModel[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];

  const models: PublicModel[] = [];
  for (const [providerId, providerValue] of Object.entries(payload)) {
    if (!providerValue || typeof providerValue !== "object" || Array.isArray(providerValue)) continue;

    const provider = providerValue as ModelsDevProvider;
    if (!provider.models || typeof provider.models !== "object") continue;
    const providerName = typeof provider.name === "string" && provider.name.trim()
      ? provider.name.trim()
      : providerId;

    for (const [modelKey, modelValue] of Object.entries(provider.models)) {
      if (!modelValue || typeof modelValue !== "object" || Array.isArray(modelValue)) continue;
      const model = modelValue as ModelsDevModel;
      const id = typeof model.id === "string" && model.id.trim() ? model.id.trim() : modelKey;
      const name = typeof model.name === "string" && model.name.trim() ? model.name.trim() : id;
      const description = typeof model.description === "string" && model.description.trim()
        ? model.description.trim()
        : undefined;

      models.push({ id, name, provider: providerName, ...(description ? { description } : {}) });
    }
  }

  const unique = new Map<string, PublicModel>();
  for (const model of models) {
    if (!unique.has(model.id)) unique.set(model.id, model);
  }

  return [...unique.values()].sort((a, b) =>
    `${a.provider}/${a.name}`.localeCompare(`${b.provider}/${b.name}`),
  );
}

async function loadModels(): Promise<{ models: PublicModel[]; cached: boolean; fallback: boolean }> {
  const now = Date.now();
  if (cachedModels && now - cachedAt < CACHE_TTL_MS) {
    return { models: cachedModels, cached: true, fallback: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(MODELS_DEV_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!upstream.ok) throw new Error(`Models.dev respondeu ${upstream.status}`);

    const normalized = normalizeModels(await upstream.json());
    if (normalized.length === 0) throw new Error("Models.dev retornou uma lista vazia");

    cachedModels = normalized;
    cachedAt = Date.now();
    return { models: normalized, cached: false, fallback: false };
  } catch {
    if (cachedModels) {
      return { models: cachedModels, cached: true, fallback: false };
    }
    return { models: FALLBACK_MODELS, cached: false, fallback: true };
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/models", async (_req: Request, res: Response) => {
  const result = await loadModels();
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(result);
});

export default router;
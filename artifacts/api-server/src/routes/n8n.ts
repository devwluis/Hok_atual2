import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const ALLOWED = [
  "/api/v1/workflows",
  "/api/v1/executions",
  "/api/v1/credentials",
  "/api/v1/tags",
  "/api/v1/workflow",
];

function allowed(p: string) {
  return ALLOWED.some((a) => p.startsWith(a));
}

router.post("/api/n8n-proxy", async (req: Request, res: Response) => {
  const { baseUrl, token, path, method = "GET", body } = req.body as {
    baseUrl?: string; token?: string; path?: string; method?: string; body?: unknown;
  };

  if (!baseUrl || !token || !path)
    return res.status(400).json({ error: "baseUrl, token e path são obrigatórios." });

  if (!allowed(path))
    return res.status(403).json({ error: `Caminho não permitido: ${path}` });

  const targetUrl = baseUrl.replace(/\/$/, "") + path;

  try {
    const upstream = await fetch(targetUrl, {
      method: method.toUpperCase(),
      headers: {
        "X-N8N-API-KEY": token,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10_000),
    });

    const ct = upstream.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return res.status(upstream.status).json(await upstream.json());
    }
    return res.status(upstream.status).set("Content-Type", "text/plain").send(await upstream.text());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return res.status(502).json({ error: `Proxy error: ${msg}` });
  }
});

export default router;

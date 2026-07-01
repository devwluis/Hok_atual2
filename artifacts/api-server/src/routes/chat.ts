import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

type Msg = { role: string; content: string };

router.post("/api/chat", async (req: Request, res: Response) => {
  const {
    messages = [],
    model = DEFAULT_MODEL,
    apiKey,
    stream = true,
  } = req.body as {
    messages?: Msg[];
    model?: string;
    apiKey?: string;
    stream?: boolean;
  };

  if (!apiKey) {
    res.status(400).json({ error: "Groq API key não configurada. Vá em Configurações e adicione sua chave Groq." });
    return;
  }

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      res.status(upstream.status).json({ error: `Erro Groq ${upstream.status}: ${errText.slice(0, 200)}` });
      return;
    }

    if (stream && upstream.body) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
        res.end();
      };
      pump().catch(() => res.end());
    } else {
      const json = await upstream.json() as unknown;
      res.json(json);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    res.status(500).json({ error: msg });
  }
});

export default router;

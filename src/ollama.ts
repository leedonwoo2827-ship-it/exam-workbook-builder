import { requestUrl } from "obsidian";

export interface OllamaGenerateRequest {
  url: string;
  model: string;
  prompt: string;
  system?: string;
  images?: string[];
  temperature?: number;
  timeoutMs?: number;
}

export async function listModels(url: string): Promise<string[]> {
  const res = await requestUrl({
    url: `${url.replace(/\/$/, "")}/api/tags`,
    method: "GET",
    throw: false,
  });
  if (res.status !== 200) throw new Error(`Ollama /api/tags HTTP ${res.status}`);
  const data = res.json as { models?: Array<{ name: string }> };
  return (data.models ?? []).map((m) => m.name);
}

export async function generateText(req: OllamaGenerateRequest): Promise<string> {
  const body = JSON.stringify({
    model: req.model,
    prompt: req.prompt,
    system: req.system,
    images: req.images,
    stream: false,
    options: {
      temperature: req.temperature ?? 0.4,
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 180000);

  try {
    const r = await fetch(`${req.url.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Ollama HTTP ${r.status}: ${text.slice(0, 200)}`);
    }
    const data = (await r.json()) as { response?: string; error?: string };
    if (data.error) throw new Error(`Ollama error: ${data.error}`);
    return data.response ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

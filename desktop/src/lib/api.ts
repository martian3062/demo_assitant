import axios from "axios";

export type ChatMessage = { role: string; content: string };

const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
  "http://127.0.0.1:8000/api";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export async function health() {
  const { data } = await http.get("/health");
  return data;
}

export async function getModelCatalog() {
  const { data } = await http.get("/models/catalog");
  return data;
}

export async function getSettings() {
  const { data } = await http.get("/settings");
  return data;
}

export async function saveGroqSettings(payload: {
  groq_api_key?: string;
  api_key?: string;
  groqKey?: string;
  groq_key?: string;
  groq_model?: string;
  sandbox_default?: boolean;
}) {
  const { data } = await http.post("/settings/groq-key", payload);
  return data;
}

export async function chat(payload: { message: string; history?: ChatMessage[] }) {
  const { data } = await http.post("/chat", payload);
  return data;
}

export async function chatStream(
  payload: { message: string; history?: ChatMessage[] },
  onToken: (token: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Stream failed: ${res.status} ${txt}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") return;
        if (data.startsWith("[ERROR]")) throw new Error(data);
        if (data === "stream-started") continue;
        onToken(data);
      }
    }
  }
}

export async function sttAudio(blob: Blob) {
  const form = new FormData();
  form.append("audio", blob, "voice.webm");
  const { data } = await http.post("/stt", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function setupOpenClaw() {
  const { data } = await http.post("/setup/openclaw");
  return data;
}

export async function listAgents() {
  const { data } = await http.get("/agents");
  return data;
}

export async function createAgent(payload: Record<string, unknown>) {
  const { data } = await http.post("/agents", payload);
  return data;
}

export async function createAgentFromChat(payload: { prompt: string }) {
  const { data } = await http.post("/agents/create-from-chat", payload);
  return data;
}

export async function listAgentTemplates() {
  const { data } = await http.get("/agents/templates");
  return data;
}

export async function createAgentFromTemplate(template_key: string) {
  const { data } = await http.post("/agents/create-from-template", { template_key });
  return data;
}

export async function runAgentNow(id: number) {
  const { data } = await http.post(`/agents/${id}/run-now`);
  return data;
}

export async function toggleAgentActive(id: number) {
  const { data } = await http.post(`/agents/${id}/toggle-active`);
  return data;
}

export async function toggleAgentSandbox(id: number) {
  const { data } = await http.post(`/agents/${id}/toggle-sandbox`);
  return data;
}

export async function listRuns() {
  const { data } = await http.get("/runs");
  return data;
}

export async function listSystemLogs() {
  const { data } = await http.get("/system-logs");
  return data;
}

export async function getAnalyticsSummary(days = 14) {
  const { data } = await http.get(`/analytics/summary?days=${days}`);
  return data;
}

export async function searchNews(q: string, limit = 8) {
  const { data } = await http.get(`/news/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return data;
}

export async function crawlExtract(url: string) {
  const { data } = await http.post("/crawl/extract", { url });
  return data;
}

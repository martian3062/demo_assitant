import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

export type HealthResponse = { ok: boolean; service?: string; time?: string };
export type ModelCatalog = Record<string, string[]>;
export type SettingsResponse = {
  id?: number;
  groq_model?: string;
  sandbox_default?: boolean;
  has_key?: boolean;
};

export type Agent = {
  id: number;
  name: string;
  role: string;
  goal: string;
  action_type: string;
  schedule_cron: string;
  active: boolean;
  sandbox: boolean;
  created_at: string;
  updated_at: string;
};

export type RunLog = {
  id: number;
  agent: number | null;
  agent_name?: string | null;
  status: "success" | "failed" | "sandboxed";
  message: string;
  started_at: string;
  ended_at: string;
};

export type SystemLog = {
  id: number;
  source: string;
  level: string;
  message: string;
  created_at: string;
};

export type TrendItem = {
  date: string;
  success: number;
  failed: number;
  sandboxed: number;
  total: number;
};

export type AnalyticsSummary = {
  days: number;
  trend: TrendItem[];
  status_totals: {
    success: number;
    failed: number;
    sandboxed: number;
  };
  top_agents: { agent_id: number; name: string; total: number }[];
  total_runs: number;
};

export type NewsItem = {
  title: string;
  link: string;
  published: string;
  summary: string;
  source: string;
};

export async function health(): Promise<HealthResponse> {
  const { data } = await api.get("/health");
  return data;
}

export async function getModelCatalog(): Promise<{ catalog: ModelCatalog }> {
  const { data } = await api.get("/models/catalog");
  return data;
}

export async function getSettings(): Promise<SettingsResponse> {
  const { data } = await api.get("/settings");
  return data;
}

export async function saveGroqSettings(payload: {
  groq_api_key?: string;
  api_key?: string;
  groqKey?: string;
  groq_key?: string;
  groq_model?: string;
  model?: string;
  sandbox_default?: boolean;
}): Promise<{ ok: boolean; settings?: SettingsResponse; error?: string }> {
  const { data } = await api.post("/settings/groq-key", payload);
  return data;
}

export async function chat(payload: {
  message: string;
  history?: { role: string; content: string }[];
}): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const { data } = await api.post("/chat", payload);
  return data;
}

export async function chatStream(
  payload: { message: string; history?: { role: string; content: string }[] },
  onToken: (token: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "Streaming failed");
    throw new Error(text || "Streaming failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const token = line.replace("data: ", "");
      if (token === "[DONE]") return;
      if (token.startsWith("[ERROR]")) throw new Error(token);
      onToken(token);
    }
  }
}

export async function sttAudio(audioBlob: Blob): Promise<{ ok: boolean; text?: string; error?: string }> {
  const form = new FormData();
  form.append("audio", audioBlob, "voice.webm");
  const { data } = await api.post("/stt", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function setupOpenClaw(): Promise<any> {
  const { data } = await api.post("/setup/openclaw", {});
  return data;
}

export async function listAgents(): Promise<{ items: Agent[] }> {
  const { data } = await api.get("/agents");
  return data;
}

export async function createAgent(payload: Partial<Agent>): Promise<{ ok: boolean; item?: Agent }> {
  const { data } = await api.post("/agents", payload);
  return data;
}

export async function createAgentFromChat(prompt: string): Promise<{ ok: boolean; item?: Agent; error?: string }> {
  const { data } = await api.post("/agents/create-from-chat", { prompt });
  return data;
}

export async function listAgentTemplates(): Promise<{ items: any[] }> {
  const { data } = await api.get("/agents/templates");
  return data;
}

export async function createAgentFromTemplate(key: string): Promise<{ ok: boolean; item?: Agent; error?: string }> {
  const { data } = await api.post("/agents/create-from-template", { key });
  return data;
}

export async function runAgentNow(agentId: number): Promise<any> {
  const { data } = await api.post(`/agents/${agentId}/run-now`, {});
  return data;
}

export async function toggleAgentActive(agentId: number): Promise<{ ok: boolean; item?: Agent }> {
  const { data } = await api.post(`/agents/${agentId}/toggle-active`, {});
  return data;
}

export async function toggleAgentSandbox(agentId: number): Promise<{ ok: boolean; item?: Agent }> {
  const { data } = await api.post(`/agents/${agentId}/toggle-sandbox`, {});
  return data;
}

export async function listRuns(): Promise<{ items: RunLog[] }> {
  const { data } = await api.get("/runs");
  return data;
}

export async function listSystemLogs(): Promise<{ items: SystemLog[] }> {
  const { data } = await api.get("/system-logs");
  return data;
}

export async function getAnalyticsSummary(days = 14): Promise<AnalyticsSummary> {
  const { data } = await api.get(`/analytics/summary?days=${days}`);
  return data;
}

export async function searchNews(q: string, limit = 8): Promise<{ ok: boolean; items?: NewsItem[]; error?: string }> {
  const { data } = await api.get(`/news/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return data;
}

export async function crawlExtract(url: string): Promise<{ ok: boolean; item?: any; error?: string }> {
  const { data } = await api.post("/crawl/extract", { url });
  return data;
}

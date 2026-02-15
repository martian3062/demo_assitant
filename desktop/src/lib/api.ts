import axios from "axios";

/* =========================
   Types
========================= */
export type ChatMessage = { role: string; content: string };

export type AppSettings = {
  has_key: boolean;
  groq_model: string;
  sandbox_default: boolean;
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
  agent_name?: string;
  status: "success" | "failed" | "sandboxed";
  message: string;
  started_at: string;
  ended_at: string | null;
};

export type SystemLog = {
  id: number;
  source: string;
  level: string;
  message: string;
  created_at: string;
};

/* =========================
   Base URL
   - Vercel uses VITE_API_BASE_URL
   - local fallback remains localhost
========================= */
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000/api";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

function toError(e: any, fallback = "Request failed"): Error {
  const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || fallback;
  return new Error(String(msg));
}

/* =========================
   Health + Settings + Models
========================= */
export async function health() {
  try {
    const { data } = await http.get("/health");
    return data;
  } catch (e) {
    throw toError(e, "Health check failed");
  }
}

export async function getModelCatalog() {
  try {
    const { data } = await http.get("/models/catalog");
    return data as { ok: boolean; catalog: Record<string, string[]> };
  } catch (e) {
    throw toError(e, "Failed to fetch model catalog");
  }
}

export async function getSettings() {
  try {
    const { data } = await http.get("/settings");
    return data as AppSettings;
  } catch (e) {
    throw toError(e, "Failed to fetch settings");
  }
}

export async function saveGroqSettings(payload: {
  groq_api_key?: string;
  api_key?: string;
  groqKey?: string;
  groq_key?: string;
  groq_model?: string;
  sandbox_default?: boolean;
}) {
  try {
    const { data } = await http.post("/settings/groq-key", payload);
    return data;
  } catch (e) {
    throw toError(e, "Failed to save settings");
  }
}

/* =========================
   Chat + Stream + STT
========================= */
export async function chat(payload: { message: string; history?: ChatMessage[] }) {
  try {
    const { data } = await http.post("/chat", payload);
    return data as { ok: boolean; reply?: string; error?: string };
  } catch (e) {
    throw toError(e, "Chat failed");
  }
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
    const text = await res.text().catch(() => "");
    throw new Error(`Stream failed: ${res.status} ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames split by blank line
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const lines = frame.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();

        if (!data) continue;
        if (data === "[DONE]") return;
        if (data.startsWith("[ERROR]")) {
          throw new Error(data.replace("[ERROR]", "").trim() || "Unknown stream error");
        }
        if (data === "stream-started") continue; // optional keepalive/status event
        onToken(data);
      }
    }
  }
}

export async function sttAudio(blob: Blob) {
  try {
    const form = new FormData();
    form.append("audio", blob, "voice.webm");
    const { data } = await http.post("/stt", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as { ok: boolean; text?: string; error?: string };
  } catch (e) {
    throw toError(e, "STT failed");
  }
}

/* =========================
   Setup / OpenClaw bridge
========================= */
export async function setupOpenClaw() {
  try {
    const { data } = await http.post("/setup/openclaw");
    return data;
  } catch (e) {
    throw toError(e, "Setup failed");
  }
}

/* =========================
   Agents
========================= */
export async function listAgents() {
  try {
    const { data } = await http.get("/agents");
    return data as { ok: boolean; items: Agent[] };
  } catch (e) {
    throw toError(e, "Failed to list agents");
  }
}

export async function createAgent(payload: Partial<Agent>) {
  try {
    const { data } = await http.post("/agents", payload);
    return data;
  } catch (e) {
    throw toError(e, "Failed to create agent");
  }
}

export async function createAgentFromChat(payload: { prompt: string }) {
  try {
    const { data } = await http.post("/agents/create-from-chat", payload);
    return data;
  } catch (e) {
    throw toError(e, "Failed to create agent from chat");
  }
}

export async function listAgentTemplates() {
  try {
    const { data } = await http.get("/agents/templates");
    return data as { ok: boolean; items: Array<{ key: string; name: string; description?: string }> };
  } catch (e) {
    throw toError(e, "Failed to fetch templates");
  }
}

export async function createAgentFromTemplate(template_key: string) {
  try {
    const { data } = await http.post("/agents/create-from-template", { template_key });
    return data;
  } catch (e) {
    throw toError(e, "Failed to create from template");
  }
}

export async function runAgentNow(id: number) {
  try {
    const { data } = await http.post(`/agents/${id}/run-now`);
    return data;
  } catch (e) {
    throw toError(e, "Failed to run agent");
  }
}

export async function toggleAgentActive(id: number) {
  try {
    const { data } = await http.post(`/agents/${id}/toggle-active`);
    return data;
  } catch (e) {
    throw toError(e, "Failed to toggle active");
  }
}

export async function toggleAgentSandbox(id: number) {
  try {
    const { data } = await http.post(`/agents/${id}/toggle-sandbox`);
    return data;
  } catch (e) {
    throw toError(e, "Failed to toggle sandbox");
  }
}

/* =========================
   Logs
========================= */
export async function listRuns() {
  try {
    const { data } = await http.get("/runs");
    return data as { ok: boolean; items: RunLog[] };
  } catch (e) {
    throw toError(e, "Failed to load run logs");
  }
}

export async function listSystemLogs() {
  try {
    const { data } = await http.get("/system-logs");
    return data as { ok: boolean; items: SystemLog[] };
  } catch (e) {
    throw toError(e, "Failed to load system logs");
  }
}

/* =========================
   Analytics
========================= */
export async function getAnalyticsSummary(days = 14) {
  try {
    const { data } = await http.get(`/analytics/summary?days=${days}`);
    return data;
  } catch (e) {
    throw toError(e, "Failed to load analytics");
  }
}

/* =========================
   News + Crawl
========================= */
export async function searchNews(q: string, limit = 8) {
  try {
    const { data } = await http.get(`/news/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    return data as { ok: boolean; items: any[] };
  } catch (e) {
    throw toError(e, "News search failed");
  }
}

export async function crawlExtract(url: string) {
  try {
    const { data } = await http.post("/crawl/extract", { url });
    return data as { ok: boolean; item?: { url: string; title?: string; text?: string }; error?: string };
  } catch (e) {
    throw toError(e, "Crawl extract failed");
  }
}

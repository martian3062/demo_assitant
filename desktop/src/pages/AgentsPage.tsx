import { useEffect, useState } from "react";
import {
  Agent,
  createAgent,
  createAgentFromChat,
  createAgentFromTemplate,
  listAgentTemplates,
  listAgents,
  runAgentNow,
  toggleAgentActive,
  toggleAgentSandbox
} from "../lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [prompt, setPrompt] = useState("");

  const [form, setForm] = useState({
    name: "",
    role: "",
    goal: "",
    action_type: "custom",
    schedule_cron: "",
    active: true,
    sandbox: true
  });

  const refresh = async () => {
    const [a, t] = await Promise.all([listAgents(), listAgentTemplates()]);
    setAgents(a.items || []);
    setTemplates(t.items || []);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const createManual = async () => {
    try {
      setMsg("Creating...");
      const res = await createAgent(form);
      setMsg(res.ok ? "Agent created." : "Create failed");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "Create failed");
    }
  };

  const createFromTemplate = async (key: string) => {
    try {
      setMsg("Creating from template...");
      const res = await createAgentFromTemplate(key);
      setMsg(res.ok ? "Template agent created." : res.error || "Failed");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    }
  };

  const createFromPrompt = async () => {
    if (!prompt.trim()) return;
    try {
      setMsg("Creating from prompt...");
      const res = await createAgentFromChat(prompt.trim());
      setMsg(res.ok ? "Agent created from chat." : res.error || "Failed");
      setPrompt("");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    }
  };

  const runNow = async (id: number) => {
    try {
      setMsg("Running...");
      await runAgentNow(id);
      setMsg("Run triggered.");
    } catch (e: any) {
      setMsg(e?.message || "Run failed");
    }
  };

  return (
    <div className="grid-stack">
      <div className="card grid-stack">
        <h3 style={{ margin: 0 }}>Create Agent</h3>
        <div className="grid-2">
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
        </div>
        <textarea
          className="textarea"
          placeholder="Goal"
          value={form.goal}
          onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
        />
        <div className="grid-2">
          <input
            className="input"
            placeholder="Action type"
            value={form.action_type}
            onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Schedule cron (optional)"
            value={form.schedule_cron}
            onChange={(e) => setForm((f) => ({ ...f, schedule_cron: e.target.value }))}
          />
        </div>
        <div className="row-gap">
          <button className="btn-primary" onClick={createManual}>
            Create agent
          </button>
          <span className="muted">{msg}</span>
        </div>
      </div>

      <div className="card grid-stack">
        <h3 style={{ margin: 0 }}>Create from Chat Prompt</h3>
        <div className="chat-input-row">
          <input
            className="input"
            placeholder="e.g. Monitor brand mentions every morning"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button className="btn-soft" onClick={createFromPrompt}>
            Create
          </button>
        </div>
      </div>

      <div className="card grid-stack">
        <h3 style={{ margin: 0 }}>Templates</h3>
        <div className="grid-2">
          {templates.map((t) => (
            <div key={t.key} className="card">
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div className="muted">{t.goal}</div>
              <div style={{ marginTop: 8 }}>
                <button className="btn-soft" onClick={() => createFromTemplate(t.key)}>
                  One-click create
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card grid-stack">
        <h3 style={{ margin: 0 }}>Agents</h3>
        <div className="grid-stack">
          {agents.map((a) => (
            <div key={a.id} className="card row-between">
              <div>
                <div style={{ fontWeight: 700 }}>{a.name}</div>
                <div className="muted">
                  {a.action_type} • active: {String(a.active)} • sandbox: {String(a.sandbox)}
                </div>
              </div>
              <div className="row-gap">
                <button className="btn-soft" onClick={() => runNow(a.id)}>Run now</button>
                <button className="btn-soft" onClick={async () => { await toggleAgentActive(a.id); await refresh(); }}>
                  Toggle active
                </button>
                <button className="btn-soft" onClick={async () => { await toggleAgentSandbox(a.id); await refresh(); }}>
                  Toggle sandbox
                </button>
              </div>
            </div>
          ))}
          {agents.length === 0 && <div className="muted">No agents yet.</div>}
        </div>
      </div>
    </div>
  );
}

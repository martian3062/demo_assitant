import { useEffect, useState } from "react";
import { getModelCatalog, getSettings, saveGroqSettings } from "../lib/api";

export default function SettingsPage() {
  const [hasKey, setHasKey] = useState(false);
  const [model, setModel] = useState("openai/gpt-oss-20b");
  const [sandboxDefault, setSandboxDefault] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([getSettings(), getModelCatalog()]);
        setHasKey(!!s.has_key);
        setModel(s.groq_model || "openai/gpt-oss-20b");
        setSandboxDefault(!!s.sandbox_default);
        const merged = Object.values(c.catalog || {}).flat();
        setModels(merged);
      } catch (e: any) {
        setMsg(e?.message || "Failed loading settings");
      }
    })();
  }, []);

  const save = async () => {
    try {
      setMsg("Saving...");
      const payload: any = { groq_model: model, sandbox_default: sandboxDefault };
      if (keyInput.trim()) payload.groq_api_key = keyInput.trim();
      const res = await saveGroqSettings(payload);
      if (res.ok) {
        setMsg("Saved successfully.");
        setHasKey(!!res.settings?.has_key);
        setKeyInput("");
      } else {
        setMsg(res.error || "Save failed");
      }
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    }
  };

  return (
    <div className="card grid-stack">
      <h3 style={{ margin: 0 }}>Settings</h3>
      <div className="muted">Configure Groq key/model and default sandbox behavior.</div>

      <div className="grid-2">
        <div>
          <label className="muted">Groq API Key</label>
          <input
            className="input"
            placeholder={hasKey ? "Saved (enter to replace)" : "Enter Groq API key"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>
        <div>
          <label className="muted">Model</label>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {!models.includes(model) && <option value={model}>{model}</option>}
          </select>
        </div>
      </div>

      <div className="row-gap">
        <input
          id="sandbox-default"
          type="checkbox"
          checked={sandboxDefault}
          onChange={(e) => setSandboxDefault(e.target.checked)}
        />
        <label htmlFor="sandbox-default" className="muted">
          Sandbox default for new agents
        </label>
      </div>

      <div className="row-gap">
        <button className="btn-primary" onClick={save}>
          Save settings
        </button>
        <span className="muted">{msg}</span>
      </div>
    </div>
  );
}

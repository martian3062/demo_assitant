import { useEffect, useState } from "react";
import { listRuns, listSystemLogs, type RunLog, type SystemLog } from "../lib/api";

export default function LogsPage() {
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [sys, setSys] = useState<SystemLog[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [r, s] = await Promise.all([listRuns(), listSystemLogs()]);
        setRuns(r.items || []);
        setSys(s.items || []);
      } catch (e: any) {
        setErr(e?.message || "Failed loading logs");
      }
    })();
  }, []);

  return (
    <div className="grid-stack">
      {err ? <div className="card muted">{err}</div> : null}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Run Logs</h3>
        <div className="grid-stack">
          {runs.map((r) => (
            <div key={r.id} className="card">
              <div style={{ fontWeight: 700 }}>
                {r.status} • {r.agent_name || "No agent"}
              </div>
              <div className="muted">{r.message}</div>
              <div className="muted">{new Date(r.started_at).toLocaleString()}</div>
            </div>
          ))}
          {runs.length === 0 ? <div className="muted">No run logs.</div> : null}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>System Logs</h3>
        <div className="grid-stack">
          {sys.map((s) => (
            <div key={s.id} className="card">
              <div style={{ fontWeight: 700 }}>
                {s.source} • {s.level}
              </div>
              <div className="muted">{s.message}</div>
              <div className="muted">{new Date(s.created_at).toLocaleString()}</div>
            </div>
          ))}
          {sys.length === 0 ? <div className="muted">No system logs.</div> : null}
        </div>
      </div>
    </div>
  );
}

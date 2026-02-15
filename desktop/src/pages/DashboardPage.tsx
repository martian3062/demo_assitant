import { useEffect, useState } from "react";
import { health, listAgents, listRuns } from "../lib/api";

export default function DashboardPage() {
  const [h, setH] = useState<any>(null);
  const [agents, setAgents] = useState(0);
  const [runs, setRuns] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [hh, aa, rr] = await Promise.all([health(), listAgents(), listRuns()]);
        setH(hh);
        setAgents(aa.items?.length || 0);
        setRuns(rr.items?.length || 0);
      } catch {
        // ignore noisy failures in dashboard overview
      }
    })();
  }, []);

  return (
    <div className="grid-stack">
      <div className="grid-2">
        <div className="card">
          <div className="muted">Service</div>
          <h2>{h?.ok ? "Healthy" : "Unknown"}</h2>
          <div className="muted">{h?.service || "personaliz-backend"}</div>
        </div>
        <div className="card">
          <div className="muted">System Snapshot</div>
          <h2>{agents} Agents</h2>
          <div className="muted">{runs} Recent runs</div>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Welcome</h3>
        <p className="muted">
          Use the Assistant tab or floating button to chat, run quick actions, voice assistant, and news scout.
        </p>
      </div>
    </div>
  );
}

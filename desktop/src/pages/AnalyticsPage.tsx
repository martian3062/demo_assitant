import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AnalyticsSummary, getAnalyticsSummary } from "../lib/api";

export default function AnalyticsPage() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [err, setErr] = useState("");

  const load = async (d: number) => {
    try {
      setErr("");
      const r = await getAnalyticsSummary(d);
      setData(r);
    } catch (e: any) {
      setErr(e?.message || "Failed loading analytics");
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const statusData = data
    ? [
        { name: "Success", value: data.status_totals.success },
        { name: "Failed", value: data.status_totals.failed },
        { name: "Sandboxed", value: data.status_totals.sandboxed }
      ]
    : [];

  return (
    <div className="grid-stack">
      <div className="card row-between">
        <h3 style={{ margin: 0 }}>Analytics</h3>
        <div className="row-gap">
          {[7, 14, 30].map((d) => (
            <button key={d} className={`btn-soft ${days === d ? "active" : ""}`} onClick={() => setDays(d)}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      {err && <div className="card muted">{err}</div>}

      <div className="card h320">
        <div className="muted">Trend: total runs/day</div>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data?.trend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card h320">
        <div className="muted">Status totals</div>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="muted">Total runs: {data?.total_runs ?? 0}</div>
        <div className="muted">Top agents:</div>
        <ul>
          {(data?.top_agents || []).map((a) => (
            <li key={a.agent_id}>
              {a.name} ({a.total})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

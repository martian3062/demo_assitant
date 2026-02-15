import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { useTheme } from "./hooks/useTheme";
import AssistantPanel from "./components/AssistantPanel";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import AgentsPage from "./pages/AgentsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LogsPage from "./pages/LogsPage";

type TabKey = "dashboard" | "settings" | "agents" | "analytics" | "logs" | "assistant";

export default function App() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const { mode } = useTheme();

  const topbarRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (topbarRef.current) {
      gsap.fromTo(
        topbarRef.current,
        { y: -16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    if (fabRef.current) {
      gsap.to(fabRef.current, {
        y: -4,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
  }, []);

  const content = useMemo(() => {
    if (tab === "settings") return <SettingsPage />;
    if (tab === "agents") return <AgentsPage />;
    if (tab === "analytics") return <AnalyticsPage />;
    if (tab === "logs") return <LogsPage />;
    if (tab === "assistant") return <AssistantPanel embedded />;
    return <DashboardPage />;
  }, [tab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "settings", label: "Settings" },
    { key: "agents", label: "Agents" },
    { key: "analytics", label: "Analytics" },
    { key: "logs", label: "Logs" },
    { key: "assistant", label: "Assistant" }
  ];

  return (
    <div className="app-shell">
      <div className="bg-clouds" />
      <div ref={topbarRef} className="topbar glass">
        <div className="brand">
          <h1>Personaliz Desktop Assistant</h1>
          <p>Automations made non-technical-friendly • mode: {mode}</p>
        </div>
        <div className="clock">{clock.toLocaleString()}</div>
      </div>

      <div className="container">
        <div className="toolbar glass">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`btn-soft ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="grid-stack"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>

      <button ref={fabRef} className="assistant-fab" onClick={() => setAssistantOpen(true)}>
        Assistant
      </button>

      <AnimatePresence>
        {assistantOpen && (
          <motion.div
            className="assistant-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAssistantOpen(false)}
          >
            <motion.div
              className="assistant-modal-wrap"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.99 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AssistantPanel onClose={() => setAssistantOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

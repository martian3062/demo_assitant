import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  chat,
  chatStream,
  crawlExtract,
  createAgentFromTemplate,
  getModelCatalog,
  getSettings,
  listAgentTemplates,
  runAgentNow,
  searchNews,
  setupOpenClaw,
  sttAudio
} from "../lib/api";

type AssistantTab = "chat" | "actions" | "voice" | "news" | "status";
type Msg = { role: "user" | "assistant" | "system"; content: string };

type Props = {
  onClose?: () => void;
  embedded?: boolean;
};

export default function AssistantPanel({ onClose, embedded = false }: Props) {
  const [tab, setTab] = useState<AssistantTab>("chat");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "system", content: "Hello! I can chat, run quick actions, transcribe voice, and scout news." }
  ]);
  const [input, setInput] = useState("");
  const [stream, setStream] = useState(true);
  const [busy, setBusy] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [newsQuery, setNewsQuery] = useState("OpenClaw AI");
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [extractUrl, setExtractUrl] = useState("");
  const [extractText, setExtractText] = useState("");

  const [statusJson, setStatusJson] = useState<string>("{}");

  const panelRef = useRef<HTMLDivElement | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(panelRef.current, { y: 8, opacity: 0.9 }, { y: 0, opacity: 1, duration: 0.28 });
    }
  }, []);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, tab]);

  useEffect(() => {
    (async () => {
      try {
        const [tpl, s, catalog] = await Promise.all([listAgentTemplates(), getSettings(), getModelCatalog()]);
        setTemplates(tpl.items || []);
        setStatusJson(JSON.stringify({ settings: s, catalog: catalog.catalog }, null, 2));
      } catch (e: any) {
        setStatusJson(JSON.stringify({ error: e?.message || "Failed loading status" }, null, 2));
      }
    })();
  }, []);

  const tabs: { key: AssistantTab; label: string }[] = useMemo(
    () => [
      { key: "chat", label: "Chat" },
      { key: "actions", label: "Quick Actions" },
      { key: "voice", label: "Voice" },
      { key: "news", label: "News Scout" },
      { key: "status", label: "Status" }
    ],
    []
  );

  const safeHistory = (arr: Msg[]) =>
    arr
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

  const sendChat = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      if (stream) {
        // Placeholder assistant bubble to append streamed tokens
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        await chatStream(
          { message: text, history: safeHistory(nextMessages) },
          (token) => {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (!last || last.role !== "assistant") {
                copy.push({ role: "assistant", content: token });
              } else {
                last.content += token;
              }
              return copy;
            });
          }
        );
      } else {
        const res = await chat({ message: text, history: safeHistory(nextMessages) });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.reply || res.error || "No response from assistant." }
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "system", content: e?.message || "Chat failed" }]);
    } finally {
      setBusy(false);
    }
  };

  const runQuick = async (kind: "setup" | "run-first" | "tpl-trending" | "tpl-brand") => {
    try {
      setBusy(true);
      if (kind === "setup") {
        const r = await setupOpenClaw();
        setMessages((m) => [...m, { role: "system", content: JSON.stringify(r, null, 2) }]);
      } else if (kind === "tpl-trending") {
        const r = await createAgentFromTemplate("trending_openclaw_daily");
        setMessages((m) => [...m, { role: "system", content: `Created: ${r.item?.name || "failed"}` }]);
      } else if (kind === "tpl-brand") {
        const r = await createAgentFromTemplate("brand_monitoring");
        setMessages((m) => [...m, { role: "system", content: `Created: ${r.item?.name || "failed"}` }]);
      } else {
        const created = await createAgentFromTemplate("daily_calendar_brief");
        if (created.item?.id) {
          const r = await runAgentNow(created.item.id);
          setMessages((m) => [...m, { role: "system", content: JSON.stringify(r, null, 2) }]);
        } else {
          setMessages((m) => [...m, { role: "system", content: "Could not create bootstrap agent." }]);
        }
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "system", content: e?.message || "Action failed" }]);
    } finally {
      setBusy(false);
    }
  };

  const startRecord = async () => {
    try {
      const streamObj = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = streamObj;

      const chunks: Blob[] = [];
      const mr = new MediaRecorder(streamObj, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      mr.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });
          if (!blob.size) {
            setMessages((m) => [...m, { role: "system", content: "No audio captured." }]);
            return;
          }

          setBusy(true);
          const stt = await sttAudio(blob);
          const transcript = (stt.text || "").trim();

          if (!transcript) {
            setMessages((m) => [...m, { role: "system", content: "No speech detected." }]);
            return;
          }

          setMessages((m) => [...m, { role: "user", content: transcript }]);

          const res = await chat({ message: transcript });
          const reply = res.reply || res.error || "No reply";
          setMessages((m) => [...m, { role: "assistant", content: reply }]);

          const utter = new SpeechSynthesisUtterance(reply);
          utter.rate = 1;
          utter.pitch = 1;
          speechSynthesis.speak(utter);
        } catch (e: any) {
          setMessages((m) => [...m, { role: "system", content: e?.message || "Voice flow failed" }]);
        } finally {
          setBusy(false);
          // cleanup mic tracks
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
        }
      };

      mr.start();
      setRecording(true);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "system", content: e?.message || "Microphone access failed" }]);
    }
  };

  const stopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const doNewsSearch = async () => {
    if (!newsQuery.trim()) return;
    try {
      setBusy(true);
      const r = await searchNews(newsQuery.trim(), 8);
      setNewsItems(r.items || []);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "system", content: e?.message || "News search failed" }]);
    } finally {
      setBusy(false);
    }
  };

  const doExtract = async () => {
    if (!extractUrl.trim()) return;
    try {
      setBusy(true);
      const r = await crawlExtract(extractUrl.trim());
      setExtractText(r.item?.text || r.error || "No text extracted");
    } catch (e: any) {
      setExtractText(e?.message || "Extract failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={panelRef} className={`assistant-panel glass ${embedded ? "card" : ""}`}>
      <div className="assistant-header">
        <div>
          <h3>Assistant</h3>
          <p>Chat, automations, voice, and scouting in one place</p>
        </div>
        {onClose ? (
          <button className="btn-soft" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      <div className="assistant-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`chip ${tab === t.key ? "chip-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="assistant-body">
        {tab === "chat" && (
          <div className="section">
            <div className="row-between">
              <span className="muted">Streaming</span>
              <button className={`btn-soft ${stream ? "active" : ""}`} onClick={() => setStream((s) => !s)}>
                {stream ? "ON" : "OFF"}
              </button>
            </div>

            <div ref={chatListRef} className="chat-list">
              {messages.map((m, i) => (
                <div key={`${m.role}-${i}`} className={`bubble ${m.role}`}>
                  <div className="bubble-role">{m.role}</div>
                  <div className="bubble-text">{m.content}</div>
                </div>
              ))}
            </div>

            <div className="chat-input-row">
              <input
                className="input"
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat();
                }}
              />
              <button className="btn-primary" onClick={sendChat} disabled={busy}>
                Send
              </button>
            </div>
          </div>
        )}

        {tab === "actions" && (
          <div className="section grid-stack">
            <div className="row-gap">
              <button className="btn-primary" disabled={busy} onClick={() => runQuick("setup")}>
                Setup OpenClaw
              </button>
              <button className="btn-soft" disabled={busy} onClick={() => runQuick("run-first")}>
                Run first agent now
              </button>
            </div>

            <div className="row-gap">
              <button className="btn-soft" disabled={busy} onClick={() => runQuick("tpl-trending")}>
                Create Trending Template
              </button>
              <button className="btn-soft" disabled={busy} onClick={() => runQuick("tpl-brand")}>
                Create Brand Monitoring
              </button>
            </div>

            <div className="muted">Loaded templates: {templates.length}</div>
          </div>
        )}

        {tab === "voice" && (
          <div className="section">
            <div className="row-gap">
              {!recording ? (
                <button className="btn-primary" disabled={busy} onClick={startRecord}>
                  Start recording
                </button>
              ) : (
                <button className="btn-soft active" onClick={stopRecord}>
                  Stop recording
                </button>
              )}
              <span className="muted">{recording ? "Listening..." : "Click start to record voice"}</span>
            </div>
          </div>
        )}

        {tab === "news" && (
          <div className="section">
            <div className="chat-input-row">
              <input
                className="input"
                value={newsQuery}
                onChange={(e) => setNewsQuery(e.target.value)}
                placeholder="Search topic..."
              />
              <button className="btn-primary" onClick={doNewsSearch} disabled={busy}>
                Search
              </button>
            </div>

            <div className="news-list">
              {newsItems.map((n, i) => (
                <a key={`${n.link}-${i}`} className="news-item" href={n.link} target="_blank" rel="noreferrer">
                  <div className="news-title">{n.title}</div>
                  <div className="news-meta">
                    {n.source} • {n.published}
                  </div>
                </a>
              ))}
            </div>

            <div className="chat-input-row" style={{ marginTop: 10 }}>
              <input
                className="input"
                value={extractUrl}
                onChange={(e) => setExtractUrl(e.target.value)}
                placeholder="Paste article URL to extract text..."
              />
              <button className="btn-soft" onClick={doExtract} disabled={busy}>
                Extract
              </button>
            </div>

            <textarea
              className="textarea"
              value={extractText}
              readOnly
              placeholder="Extracted text appears here..."
            />
          </div>
        )}

        {tab === "status" && (
          <div className="section">
            <div className="muted">Settings + model catalog snapshot</div>
            <pre className="status-box">{statusJson}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { createApi, formatApiError } from "../api";

const QUICK = [
  "what should i focus on today?",
  "exam next week help me plan",
  "put a TOC goal in my app with steps",
  "how are my goals looking overall?",
];

const CHAT_STORAGE_KEY = "ecliptica_assistant_chat_v1";
const MAX_STORED = 120;

const WELCOME = {
  role: "assistant",
  text:
    "I'm your Ecliptica coach — talk the same way you would to Gemini.\n\nI can see your **Goals**, **tasks**, and **Dashboard** schedule live, and I can add goals, steps, and tasks when you want.\n\nHealth & Finance pages exist in the app, but server data for those isn't wired yet — I can still plan with you there.\n\nAsk anything. No formal mode required.\n\nYour chat is saved on this device — scroll up anytime to see earlier messages.",
  at: null,
};

function loadChatLog() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [WELCOME];
    return parsed
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.text)
      .map((m) => ({
        role: m.role,
        text: String(m.text),
        at: m.at || null,
      }));
  } catch {
    return [WELCOME];
  }
}

function saveChatLog(messages) {
  try {
    const trimmed = messages.slice(-MAX_STORED);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full or private mode — ignore
  }
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Assistant() {
  const [messages, setMessages] = useState(() => loadChatLog());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const didInitialScroll = useRef(false);

  // Persist whenever messages change
  useEffect(() => {
    saveChatLog(messages);
  }, [messages]);

  // Scroll to bottom on new messages (after first load, smooth)
  useEffect(() => {
    if (!didInitialScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      didInitialScroll.current = true;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearChat = () => {
    if (!window.confirm("Clear this chat log on this device? Goals in the app stay safe.")) {
      return;
    }
    const fresh = [{ ...WELCOME, at: new Date().toISOString() }];
    setMessages(fresh);
    saveChatLog(fresh);
    setError("");
  };

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setInput("");
    setError("");
    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: "user", text: content, at: now }]);
    setLoading(true);

    try {
      const api = createApi(token, 120000);
      // Send recent history so the AI remembers this thread
      const history = messages
        .filter((m) => m.text && m.role !== "system")
        .slice(-16)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api.post("/assistant/chat", {
        message: content,
        history,
      });

      let reply =
        res.data?.reply ||
        "I could not generate a reply. Please try again.";

      const applied = res.data?.actions_applied;
      if (Array.isArray(applied) && applied.length > 0 && !reply.includes("✓")) {
        reply +=
          "\n\n—\n" +
          applied.map((a) => `✓ ${a}`).join("\n");
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", text: reply, at: new Date().toISOString() },
      ]);
    } catch (err) {
      const msg = formatApiError(err, "Assistant request failed");
      setError(msg);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Sorry — I hit a problem: ${msg}`,
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Assistant</h1>
          <p className="mt-1 text-sm text-gray-400">
            Chat log saved on this device · scroll up for earlier messages
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
        >
          Clear log
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={loading}
            className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200 transition hover:bg-purple-500/20 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200/90">
          {error}
        </div>
      ) : null}

      <div
        ref={listRef}
        className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/5 bg-[#121218] p-4"
      >
        {messages.map((msg, i) => (
          <div
            key={`${msg.at || "m"}-${i}`}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "border border-white/5 bg-white/5 text-gray-200"
              }`}
            >
              {msg.at ? (
                <div
                  className={`mb-1 text-[10px] ${
                    msg.role === "user" ? "text-purple-200/70" : "text-gray-500"
                  }`}
                >
                  {formatTime(msg.at)}
                </div>
              ) : null}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading ? (
          <div className="px-1 text-xs text-gray-500">
            Thinking… (first reply after idle can take up to ~1 min)
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything — plans, exams, goals, schedule…"
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-700 bg-[#0b0b0f] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-medium transition hover:bg-purple-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

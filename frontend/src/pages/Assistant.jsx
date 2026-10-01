import { useState, useRef, useEffect } from "react";
import { createApi, formatApiError } from "../api";

const QUICK = [
  "What should I do today?",
  "Plan my day",
  "Break down a goal",
  "I missed tasks — help me catch up",
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi — I'm Ecliptica AI. Tell me what you want to achieve (exam, project, habit). I'll estimate time and build a day-by-day plan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
    setMessages((m) => [...m, { role: "user", text: content }]);
    setLoading(true);

    try {
      const api = createApi(token);
      // Send recent history only (skip the welcome if it's the only assistant msg)
      const history = messages
        .filter((m) => m.text)
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api.post("/assistant/chat", {
        message: content,
        history,
      });

      const reply =
        res.data?.reply ||
        "I could not generate a reply. Please try again.";

      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      const msg = formatApiError(err, "Assistant request failed");
      setError(msg);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Sorry — I hit a problem: ${msg}`,
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Assistant</h1>
        <p className="mt-1 text-sm text-gray-400">
          Plan goals, exams, and your day — powered by Gemini
        </p>
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

      <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/5 bg-[#121218] p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "border border-white/5 bg-white/5 text-gray-200"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="px-1 text-xs text-gray-500">Thinking…</div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. TOC exam in 4 days — I have syllabus + 3 years papers"
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

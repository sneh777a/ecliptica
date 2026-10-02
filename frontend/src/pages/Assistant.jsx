import { useState, useRef, useEffect } from "react";
import { createApi, formatApiError } from "../api";

const QUICK = [
  "what should i focus on today?",
  "exam next week help me plan",
  "put a TOC goal in my app with steps",
  "i fell behind, help me catch up",
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hey — talk to me like a normal chat. Short notes, typos, ‘exam next week help’ — all fine.\n\nI can see your goals and tasks. If you want something saved, just say things like “put this in my goals” or “ok save that plan”.",
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
      const history = messages
        .filter((m) => m.text)
        .slice(-10)
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
          Natural chat · reads your goals · can save plans when you want
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
          placeholder="type however you talk — e.g. exam in 4 days toc help"
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
